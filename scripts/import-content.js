/**
 * CMS 内容导入工具 v3
 * 
 * 基于 HelpLook API 直接获取内容，无需 Playwright 浏览器抓取
 * 
 * 改进：
 * 1. 使用 API 直接获取内容（比 Playwright 快 10-50 倍）
 * 2. 不创建外层根目录，7个目录直接作为顶级
 * 3. 过滤无效/装饰性图片
 * 4. 清理乱码文本
 * 5. HTML 表格准确转 Markdown 表格
 */

const axios = require('axios');
const TurndownService = require('turndown');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CMS_API = 'http://localhost:8080/api';
const HL_API = 'https://api-get.helplook.net/foreground/content';
const TANNANT_ID = '3252';
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

// 7个目标目录（slug → 中文名），直接作为顶级目录，无外层包装
const TARGET_DIRS = [
  { slug: 'R2gOqYsI', name: '保险监管统计（2026版）' },
  { slug: 'JT-east', name: '保险集团EAST' },
  { slug: 'VL9xklwZ', name: '数据管理' },
  { slug: 'jgtj', name: '保险监管统计（2005版）' },
  { slug: 'NDUIbK', name: '财产险公司EAST' },
  { slug: 'life-east-2024', name: '人身保险公司EAST（2024版）' },
  { slug: 'regul-model', name: '监管报送' },
];

// Turndown 配置（不添加自定义表格规则，表格由预处理阶段处理）
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

// ============ 统计 ============

const stats = { folders: 0, articles: 0, images: 0, attachments: 0, skippedImages: 0, errors: [] };

// ============ HelpLook API ============

async function hlGetContent(slug) {
  try {
    const res = await axios.get(`${HL_API}/get-content`, {
      params: { tannant_id: TANNANT_ID, slug },
      timeout: 30000,
    });
    return res.data?.data;
  } catch (e) {
    console.error(`  API 请求失败: ${slug}`, e.message);
    return null;
  }
}

// ============ CMS API ============

async function cmsPost(url, data) {
  try {
    const res = await axios.post(`${CMS_API}${url}`, data, { timeout: 15000 });
    return res.data?.data;
  } catch (e) {
    const msg = e.response?.data?.message || e.message;
    console.error(`  CMS POST ${url} 失败: ${msg}`);
    return null;
  }
}

async function cmsPut(url) {
  try {
    await axios.put(`${CMS_API}${url}`, null, { timeout: 15000 });
  } catch (e) {
    console.error(`  CMS PUT ${url} 失败:`, e.response?.data?.message || e.message);
  }
}

async function uploadFileToCms(filePath, fileName, refType, refCode) {
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), fileName);
    if (refType) form.append('refType', refType);
    if (refCode) form.append('refCode', refCode);
    const res = await axios.post(`${CMS_API}/attachments/upload`, form, {
      headers: form.getHeaders(),
      timeout: 60000,
    });
    return res.data?.data;
  } catch (e) {
    console.error(`  附件上传失败: ${fileName}`, e.message);
    return null;
  }
}

// ============ 辅助函数 ============

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function downloadFile(url) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    if (res.data.length < 100) {
      // 太小的文件可能是无效图片
      return null;
    }
    const urlPath = new URL(url).pathname;
    const decodedName = decodeURIComponent(path.basename(urlPath));
    const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
    const localName = `${hash}_${decodedName}`.replace(/[<>:"|?*]/g, '_');
    const localPath = path.join(DOWNLOAD_DIR, localName);
    fs.writeFileSync(localPath, res.data);
    return { localPath, fileName: decodedName || `file_${hash}`, size: res.data.length };
  } catch (e) {
    console.error(`  下载失败: ${url}`, e.message);
    return null;
  }
}

/**
 * 判断图片是否为无效/装饰性图片
 */
function isInvalidImage(imgTag, src) {
  if (!src || src.startsWith('data:')) return true;
  
  // HelpLook 平台的图标/logo/decoration 图片
  if (src.includes('/icon/') || src.includes('/nav_logo/') || src.includes('/avatar/')) return true;
  if (src.includes('helplook.net/_hl/')) return true; // CDN 静态资源
  if (src.includes('404.') && src.endsWith('.png')) return true; // 404 图片
  
  // 检查 class 是否包含装饰性标记
  const $ = cheerio.load(imgTag);
  const img = $('img');
  const cls = img.attr('class') || '';
  if (cls.includes('emoji') || cls.includes('icon') || cls.includes('avatar') || cls.includes('logo')) return true;
  
  // 检查 alt 属性为 emoji 
  const alt = img.attr('alt') || '';
  if (alt && alt.length <= 2 && /[\u{1F000}-\u{1FFFF}]/u.test(alt)) return true;
  
  // 检查 width/height 属性（图标通常很小）
  const width = parseInt(img.attr('width') || '999', 10);
  const height = parseInt(img.attr('height') || '999', 10);
  if ((width > 0 && width <= 20) || (height > 0 && height <= 20)) return true;
  
  return false;
}

/**
 * 清理 HTML 中的乱码和无用内容
 */
function cleanHtml(html) {
  if (!html) return '';
  
  // 移除零宽字符
  html = html.replace(/[\u200B\u200C\u200D\uFEFF\u00AD]/g, '');
  
  // 移除 Word 产生的 XML 标签
  html = html.replace(/<xml[\s\S]*?<\/xml>/gi, '');
  html = html.replace(/<o:p>[\s\S]*?<\/o:p>/gi, '');
  html = html.replace(/<\?xml[\s\S]*?\?>/gi, '');
  
  // 移除条件注释
  html = html.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '');
  
  // 移除 VML 相关标签
  html = html.replace(/<v:[a-z]+[\s\S]*?<\/v:[a-z]+>/gi, '');
  html = html.replace(/<v:[a-z]+[^>]*\/>/gi, '');
  
  // 清理 style 中的 mso- 前缀属性（保留其他 style）
  html = html.replace(/mso-[^;"]*;?/g, '');
  
  // 移除空 span 标签
  html = html.replace(/<span[^>]*>\s*<\/span>/gi, '');
  
  // 修复 Word 产生的 &ldquo; &rdquo; 等实体（Turndown 可处理，但清理一下）
  // 保留标准 HTML 实体
  
  // 移除连续空行
  html = html.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');
  
  return html;
}

/**
 * 清理 Markdown 中的乱码
 */
function cleanMarkdown(md) {
  if (!md) return '';
  
  // 移除零宽字符
  md = md.replace(/[\u200B\u200C\u200D\uFEFF\u00AD]/g, '');
  
  // 清理乱码模式：常见于 Word 转换时的特殊字符
  md = md.replace(/ï»¿/g, ''); // BOM
  md = md.replace(/\uFFFD/g, ''); // 替换字符
  
  // 清理 HTML 实体残留
  md = md.replace(/&nbsp;/g, ' ');
  
  // 多余空行压缩
  md = md.replace(/\n{4,}/g, '\n\n\n');
  
  return md.trim();
}

/**
 * 将 HTML 表格转为 Markdown 表格（接受 HTML 字符串）
 */
function convertHtmlTableToMarkdown(tableHtml) {
  const $ = cheerio.load(tableHtml);
  
  const rows = [];
  $('tr').each((_, tr) => {
    const cells = [];
    $(tr).find('td, th').each((_, cell) => {
      let text = $(cell).text().trim()
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ');
      cells.push(text);
    });
    if (cells.length > 0) {
      rows.push(cells);
    }
  });
  
  if (rows.length === 0) return '';
  
  const colCount = Math.max(...rows.map(r => r.length));
  for (const row of rows) {
    while (row.length < colCount) row.push('');
  }
  
  let md = '\n\n';
  md += '| ' + rows[0].join(' | ') + ' |\n';
  md += '| ' + rows[0].map(() => '---').join(' | ') + ' |\n';
  for (let i = 1; i < rows.length; i++) {
    md += '| ' + rows[i].join(' | ') + ' |\n';
  }
  md += '\n';
  return md;
}

/**
 * 预处理 HTML：用正则提取表格并转为占位符
 * 避免 cheerio $.html() 包裹 <html><body> 以及 Turndown 丢失表格的问题
 * 占位符使用纯字母数字（无下划线），防止 Turndown 转义
 */
function preprocessTables(html) {
  const tablePlaceholders = [];
  let idx = 0;
  const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
  
  const processedHtml = html.replace(tableRegex, (match) => {
    const mdTable = convertHtmlTableToMarkdown(match);
    if (mdTable) {
      const tag = `TBLPH${idx}ENDPH`;
      tablePlaceholders.push({ tag, mdTable });
      idx++;
      return `<p>${tag}</p>`;
    }
    return match;
  });
  
  return { html: processedHtml, tablePlaceholders };
}

/**
 * 将占位符替换回 Markdown 表格
 */
function restoreTables(md, tablePlaceholders) {
  for (const { tag, mdTable } of tablePlaceholders) {
    md = md.replace(tag, mdTable);
  }
  return md;
}

// ============ 处理单篇文章 ============

async function processArticle(articleData, folderCode) {
  const name = articleData.name;
  const htmlContent = articleData.content?.content || '';
  
  if (!htmlContent || htmlContent.trim().length < 10) {
    console.log(`      跳过(无内容): ${name}`);
    return;
  }
  
  console.log(`      文章: ${name}`);
  
  // 用 cheerio 解析 HTML
  const $ = cheerio.load(htmlContent);
  
  // 1. 处理图片
  const imageMap = {};
  const imgElements = $('img');
  let imgCount = 0;
  
  for (const img of imgElements.toArray()) {
    const src = $(img).attr('src') || $(img).attr('data-src') || '';
    const outerHtml = $.html(img);
    
    if (isInvalidImage(outerHtml, src)) {
      stats.skippedImages++;
      $(img).remove(); // 移除无效图片
      continue;
    }
    
    imgCount++;
    const dl = await downloadFile(src);
    if (dl) {
      const ext = path.extname(dl.fileName) || guessExtFromBuffer(fs.readFileSync(dl.localPath));
      const finalName = ext && !dl.fileName.endsWith(ext) ? dl.fileName + ext : dl.fileName;
      
      const up = await uploadFileToCms(dl.localPath, finalName, 'article', '');
      if (up) {
        imageMap[src] = up.fileUrl;
        stats.images++;
      }
      try { fs.unlinkSync(dl.localPath); } catch {}
    }
  }
  
  if (imgCount > 0) {
    console.log(`        图片: ${imgCount} 张有效, ${imgElements.toArray().length - imgCount} 张跳过`);
  }
  
  // 替换图片 src
  let html = $.html();
  for (const [orig, newUrl] of Object.entries(imageMap)) {
    html = html.split(orig).join(newUrl);
  }
  
  // 2. 处理附件链接
  const attachmentLinks = $('a[href*="resource-wangsu.helplook.net"]').toArray()
    .concat($('a[href*="attachments"]').toArray());
  
  for (const a of attachmentLinks) {
    const href = $(a).attr('href') || '';
    const text = $(a).text().trim();
    
    if (!href || !text) continue;
    
    const dl = await downloadFile(href);
    if (dl) {
      const ext = path.extname(dl.fileName) || guessExtFromBuffer(fs.readFileSync(dl.localPath));
      const finalName = ext && !dl.fileName.endsWith(ext) ? dl.fileName + ext : dl.fileName;
      
      const up = await uploadFileToCms(dl.localPath, finalName, 'article', '');
      if (up) {
        // 在 HTML 中替换链接
        html = html.split(href).join(up.downloadUrl || up.fileUrl);
        stats.attachments++;
      }
      try { fs.unlinkSync(dl.localPath); } catch {}
    }
  }
  
  // 3. 清理 HTML
  html = cleanHtml(html);
  
  // 4. 预处理表格：提取表格转为占位符（避免 Turndown 丢失表格内容）
  const { html: htmlNoTables, tablePlaceholders } = preprocessTables(html);
  
  // 5. HTML → Markdown（不含表格）
  let md = turndownService.turndown(htmlNoTables);
  
  // 6. 替换回 Markdown 表格
  md = restoreTables(md, tablePlaceholders);
  md = cleanMarkdown(md);
  
  // 5. 创建文章并发布
  const article = await cmsPost('/articles', { title: name, contentMd: md, folderCode });
  if (article?.articleCode) {
    await cmsPut(`/articles/${article.articleCode}/publish`);
    stats.articles++;
  } else {
    stats.errors.push(`文章创建失败: ${name}`);
  }
  
  await sleep(100); // 小延迟，避免 API 过载
}

/**
 * 根据文件头猜测扩展名
 */
function guessExtFromBuffer(buf) {
  if (!buf || buf.length < 4) return '';
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50) return '.png';
  // JPEG
  if (buf[0] === 0xFF && buf[1] === 0xD8) return '.jpg';
  // GIF
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return '.gif';
  // PDF
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return '.pdf';
  // ZIP (docx, xlsx are ZIP)
  if (buf[0] === 0x50 && buf[1] === 0x4B) return '.docx';
  // RAR
  if (buf[0] === 0x52 && buf[1] === 0x61 && buf[2] === 0x72) return '.rar';
  return '';
}

// ============ 递归处理目录 ============

async function processDirectory(slug, parentFolderCode, depth = 0) {
  const indent = '  '.repeat(depth);
  
  // 通过 API 获取目录内容
  const data = await hlGetContent(slug);
  if (!data) {
    console.log(`${indent}[错误] 无法获取目录: ${slug}`);
    return;
  }
  
  console.log(`${indent}目录: ${data.name} (子项: ${(data.child || []).length})`);
  
  // 分类：目录和文章
  const subDirs = (data.child || []).filter(c => c.type === '1');
  const articles = (data.child || []).filter(c => c.type === '2');
  
  console.log(`${indent}  子目录: ${subDirs.length}, 文章: ${articles.length}`);
  
  // 先处理文章（同一目录下的文章）
  for (const art of articles) {
    await processArticle(art, parentFolderCode);
  }
  
  // 再处理子目录
  for (const sub of subDirs) {
    // 在 CMS 中创建子目录
    const folder = await cmsPost('/folders', { title: sub.name, parentFolderCode });
    if (folder?.folderCode) {
      stats.folders++;
      // 递归处理子目录（需要单独 API 请求获取子目录内容）
      await processDirectory(sub.slug, folder.folderCode, depth + 1);
    }
  }
}

// ============ 主流程 ============

async function main() {
  console.log('========================================');
  console.log(' CMS 内容导入工具 v3 (API版)');
  console.log('========================================\n');
  console.log('特性:');
  console.log('  - 直接调用 HelpLook API（无需浏览器）');
  console.log('  - 7个目录直接作为顶级（无外层包装）');
  console.log('  - 自动过滤无效/装饰性图片');
  console.log('  - 清理 Word 乱码');
  console.log('  - HTML 表格准确转 Markdown 表格');
  console.log('');

  const startTime = Date.now();

  try {
    // 遍历7个目标目录，每个直接作为顶级
    for (const dir of TARGET_DIRS) {
      console.log(`\n===== ${dir.name} (${dir.slug}) =====`);
      
      // 在 CMS 中创建顶级目录
      const folder = await cmsPost('/folders', { title: dir.name });
      if (!folder?.folderCode) {
        console.log(`  [错误] 无法创建目录: ${dir.name}`);
        stats.errors.push(`目录创建失败: ${dir.name}`);
        continue;
      }
      stats.folders++;
      
      // 递归处理该目录下所有内容
      await processDirectory(dir.slug, folder.folderCode, 1);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n========================================');
    console.log(' 导入完成!');
    console.log('========================================');
    console.log(`  耗时: ${elapsed}s`);
    console.log(`  目录: ${stats.folders}`);
    console.log(`  文章: ${stats.articles}`);
    console.log(`  图片: ${stats.images} (跳过无效: ${stats.skippedImages})`);
    console.log(`  附件: ${stats.attachments}`);
    if (stats.errors.length > 0) {
      console.log(`  错误: ${stats.errors.length}`);
      stats.errors.forEach(e => console.log(`    - ${e}`));
    }

  } catch (e) {
    console.error('脚本出错:', e);
  }
}

main().catch(console.error);
