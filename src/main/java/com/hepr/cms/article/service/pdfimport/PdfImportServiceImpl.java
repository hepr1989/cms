package com.hepr.cms.article.service.pdfimport;

import com.hepr.cms.attachment.service.AttachmentService;
import com.hepr.cms.attachment.vo.AttachmentVO;
import com.hepr.cms.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentNameDictionary;
import org.apache.pdfbox.pdmodel.PDEmbeddedFilesNameTreeNode;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.common.filespecification.PDComplexFileSpecification;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.pdmodel.interactive.action.PDActionURI;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotation;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationLink;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PdfImportServiceImpl implements PdfImportService {

    private final AttachmentService attachmentService;

    private static final int MIN_IMAGE_DIMENSION = 30;
    private static final int ICON_MAX_DIMENSION = 50;
    private static final int MAX_IMAGES = 50;

    @Override
    public PdfImportResult convertToMarkdown(MultipartFile pdfFile, String articleCode) {
        PdfImportResult result = new PdfImportResult();

        try (PDDocument document = Loader.loadPDF(pdfFile.getBytes())) {
            result.setTitle(extractTitle(document, pdfFile.getOriginalFilename()));
            String articleTitle = result.getTitle();

            // 第一遍：收集全文字体大小信息，确定正文基准字号
            FontStats fontStats = collectFontStats(document);

            // 第二遍：基于基准字号提取结构化文本
            StringBuilder markdown = new StringBuilder();
            int imageCount = 0;

            for (int i = 0; i < document.getNumberOfPages(); i++) {
                if (i > 0) markdown.append("\n\n");

                PDPage page = document.getPage(i);

                // 结构化文本提取（含标题识别和表格检测）
                String pageText = extractStructuredText(document, i, fontStats, articleTitle);
                if (!pageText.trim().isEmpty()) {
                    markdown.append(pageText);
                }

                // 提取图片
                if (imageCount < MAX_IMAGES) {
                    List<ExtractedImage> images = extractImagesFromPage(page);
                    for (ExtractedImage img : images) {
                        if (imageCount >= MAX_IMAGES) break;
                        imageCount++;
                        AttachmentVO attachment = attachmentService.uploadFromBytes(
                                img.data, "image-" + imageCount + ".png", "image/png",
                                "article", articleCode
                        );
                        result.getAttachments().add(attachment);
                        markdown.append("\n\n![image-").append(imageCount).append("](")
                                .append(attachment.getDownloadUrl()).append(")\n\n");
                    }
                }

                // 提取链接
                List<String> links = extractLinksFromPage(page);
                if (!links.isEmpty() && pageText.trim().isEmpty()) {
                    for (String link : links) {
                        markdown.append("- ").append(link).append("\n");
                    }
                }
            }

            // 提取内嵌文件
            List<AttachmentVO> embeddedFiles = extractEmbeddedFiles(document, articleCode);
            if (!embeddedFiles.isEmpty()) {
                markdown.append("\n\n## 附件\n\n");
                for (AttachmentVO att : embeddedFiles) {
                    result.getAttachments().add(att);
                    markdown.append("- [").append(att.getFileName()).append("](")
                            .append(att.getDownloadUrl()).append(")\n");
                }
            }

            result.setMarkdown(PdfContentCleaner.clean(markdown.toString()));

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            String msg = e.getMessage();
            if (msg != null && msg.contains("password")) {
                throw new BusinessException(422, "PDF文件已加密，无法解析");
            }
            throw new BusinessException(422, "PDF文件格式无效：" + (msg != null ? msg : "unknown"));
        }

        return result;
    }

    // ========== 字体统计 ==========

    /** 收集全文字体大小统计，用于确定正文基准字号 */
    private FontStats collectFontStats(PDDocument document) throws IOException {
        List<Float> allFontSizes = new ArrayList<>();

        PDFTextStripper statsStripper = new PDFTextStripper() {
            @Override
            protected void processTextPosition(TextPosition text) {
                float fs = text.getFontSizeInPt();
                if (fs <= 0) fs = text.getYScale();
                if (fs > 0 && !text.isDiacritic()) {
                    allFontSizes.add(fs);
                }
                super.processTextPosition(text);
            }
        };
        statsStripper.setSortByPosition(true);
        statsStripper.getText(document);

        return new FontStats(allFontSizes);
    }

    /** 字体统计信息 */
    static class FontStats {
        final float medianFontSize;
        final float bodyFontSize;

        FontStats(List<Float> fontSizes) {
            if (fontSizes.isEmpty()) {
                medianFontSize = 12f;
                bodyFontSize = 12f;
                return;
            }
            List<Float> sorted = fontSizes.stream().sorted().collect(Collectors.toList());
            medianFontSize = sorted.get(sorted.size() / 2);

            // 众数作为正文字号（出现最频繁的字号就是正文）
            Map<Float, Long> freq = fontSizes.stream()
                    .collect(Collectors.groupingBy(fs -> Math.round(fs * 10) / 10f, Collectors.counting()));
            bodyFontSize = freq.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse(medianFontSize);
        }

        /** 判断是否为一级标题（字号 >= 正文 1.8 倍） */
        boolean isH1(float fontSize) {
            return fontSize >= bodyFontSize * 1.8f;
        }

        /** 判断是否为二级标题（字号 >= 正文 1.4 倍且 < 1.8 倍） */
        boolean isH2(float fontSize) {
            return fontSize >= bodyFontSize * 1.4f && fontSize < bodyFontSize * 1.8f;
        }

        /** 判断是否为三级标题（字号 >= 正文 1.2 倍且 < 1.4 倍） */
        boolean isH3(float fontSize) {
            return fontSize >= bodyFontSize * 1.2f && fontSize < bodyFontSize * 1.4f;
        }
    }

    // ========== 结构化文本提取 ==========

    /** 单个文本行的信息 */
    private static class TextLine {
        String text;
        float fontSize;
        float y;
        float x;
        List<TextPosition> positions;
        boolean bold;     // 是否为加粗文本
        boolean centered; // 是否为居中文本

        TextLine(String text, float fontSize, float y, float x, List<TextPosition> positions,
                 boolean bold, boolean centered) {
            this.text = text;
            this.fontSize = fontSize;
            this.y = y;
            this.x = x;
            this.positions = positions;
            this.bold = bold;
            this.centered = centered;
        }
    }

    /** 自定义 PDFTextStripper，在 writeString 中收集结构化行信息 */
    private static class StructuredTextStripper extends PDFTextStripper {
        final List<TextLine> lines = new ArrayList<>();
        private final List<TextPosition> currentPositions = new ArrayList<>();
        private final List<Boolean> currentBoldFlags = new ArrayList<>(); // 每个字符是否加粗
        private StringBuilder currentText = new StringBuilder();
        private float currentY = -1;
        private float currentFontSize = -1;
        private float pageWidth = 0; // 当前页面宽度，用于居中检测

        StructuredTextStripper() {
            super();
            setSortByPosition(true);
        }

        @Override
        protected void startPage(PDPage page) throws IOException {
            pageWidth = page.getMediaBox().getWidth();
            super.startPage(page);
        }

        @Override
        protected void writeString(String text, List<TextPosition> textPositions) throws IOException {
            if (textPositions.isEmpty()) {
                super.writeString(text, textPositions);
                return;
            }

            for (int i = 0; i < textPositions.size(); i++) {
                TextPosition tp = textPositions.get(i);
                float y = Math.round(tp.getYDirAdj());
                float fs = tp.getFontSizeInPt();
                if (fs <= 0) fs = tp.getYScale();

                // Y 坐标变化超过 2pt 视为新行（提交上一行）
                boolean yChanged = currentY >= 0 && Math.abs(y - currentY) > 2;
                if (yChanged) {
                    commitCurrentLine();
                    currentFontSize = fs;
                    currentY = y;
                } else if (currentFontSize < 0) {
                    currentFontSize = fs;
                    currentY = y;
                }

                // 同一行内 X 间隙过大时添加空格标记（用于后续表格列检测）
                if (!currentPositions.isEmpty() && !yChanged) {
                    float lastX = currentPositions.get(currentPositions.size() - 1).getXDirAdj()
                            + currentPositions.get(currentPositions.size() - 1).getWidthDirAdj();
                    float gap = tp.getXDirAdj() - lastX;
                    float avgWidth = tp.getWidthDirAdj() > 0 ? tp.getWidthDirAdj() : 5f;
                    if (gap > avgWidth * 3 && gap > 15) {
                        currentText.append(' ');
                    }
                }

                currentText.append(tp.getUnicode());
                currentPositions.add(tp);
                currentBoldFlags.add(isBold(tp));
                currentY = y;
            }
            // 每次 writeString 调用结束时提交当前行，确保行分割正确
            commitCurrentLine();
        }

        /** 提交当前行到 lines 列表 */
        private void commitCurrentLine() {
            if (currentText.length() > 0) {
                boolean lineBold = isLineBold(currentBoldFlags);
                boolean lineCentered = isLineCentered(currentPositions, pageWidth);
                lines.add(new TextLine(
                        currentText.toString().trim(),
                        currentFontSize,
                        currentY,
                        currentPositions.isEmpty() ? 0 : currentPositions.get(0).getXDirAdj(),
                        new ArrayList<>(currentPositions),
                        lineBold,
                        lineCentered
                ));
            }
            currentText = new StringBuilder();
            currentPositions.clear();
            currentBoldFlags.clear();
            currentFontSize = -1;
            currentY = -1;
        }

        /** 刷新最后可能残留的行 */
        void flush() {
            commitCurrentLine();
        }

        float getPageWidth() { return pageWidth; }
    }

    /** 判断单个字符是否为加粗 */
    private static boolean isBold(TextPosition tp) {
        try {
            String fontName = tp.getFont().getName();
            if (fontName != null) {
                String lower = fontName.toLowerCase();
                return lower.contains("bold") || lower.contains("heavy")
                        || lower.contains("black") || lower.contains("demi");
            }
        } catch (Exception e) {
            // ignore
        }
        return false;
    }

    /** 判断一行文本是否以加粗为主（超过 50% 的字符为加粗） */
    private static boolean isLineBold(List<Boolean> boldFlags) {
        if (boldFlags.isEmpty()) return false;
        long boldCount = boldFlags.stream().filter(b -> b).count();
        return boldCount > boldFlags.size() / 2;
    }

    /** 判断一行文本是否居中（文本左右边距大致相等） */
    private static boolean isLineCentered(List<TextPosition> positions, float pageWidth) {
        if (positions.isEmpty() || pageWidth <= 0) return false;
        float startX = positions.get(0).getXDirAdj();
        float endX = positions.get(positions.size() - 1).getXDirAdj()
                + positions.get(positions.size() - 1).getWidthDirAdj();
        float leftMargin = startX;
        float rightMargin = pageWidth - endX;
        float minMargin = Math.min(leftMargin, rightMargin);
        // 左右边距都大于页面宽度的 15%，且差异小于较小边距的 30%
        // 这样排除了仅有左缩进的普通段落
        return minMargin > pageWidth * 0.15f
                && Math.abs(leftMargin - rightMargin) < minMargin * 0.35f;
    }

    private String extractStructuredText(PDDocument document, int pageIndex, FontStats fontStats, String articleTitle) throws IOException {
        StructuredTextStripper stripper = new StructuredTextStripper();
        stripper.setStartPage(pageIndex + 1);
        stripper.setEndPage(pageIndex + 1);
        stripper.getText(document);
        stripper.flush();

        // 后处理：合并同一 Y 坐标上的多个文本行（处理同一行被多次 writeString 调用分割的情况，如表格单元格）
        List<TextLine> mergedLines = mergeSameYLines(stripper.lines, stripper.getPageWidth());
        return convertLinesToMarkdown(mergedLines, fontStats, articleTitle);
    }

    /** 合并同一 Y 坐标上的多个文本行 */
    private List<TextLine> mergeSameYLines(List<TextLine> lines, float pageWidth) {
        if (lines.size() <= 1) return lines;

        List<TextLine> result = new ArrayList<>();
        List<TextLine> group = new ArrayList<>();

        for (TextLine line : lines) {
            if (line.text.trim().isEmpty()) {
                if (!group.isEmpty()) {
                    result.add(mergeSameYGroup(group, pageWidth));
                    group.clear();
                }
                result.add(line);
                continue;
            }

            if (group.isEmpty()) {
                group.add(line);
            } else {
                TextLine first = group.get(0);
                if (Math.abs(line.y - first.y) <= 2) {
                    group.add(line);
                } else {
                    result.add(mergeSameYGroup(group, pageWidth));
                    group.clear();
                    group.add(line);
                }
            }
        }

        if (!group.isEmpty()) {
            result.add(mergeSameYGroup(group, pageWidth));
        }

        return result;
    }

    /** 合并同一 Y 坐标上的多个行为一个 TextLine（按 X 排序，大间隙用双空格分隔以支持表格检测） */
    private TextLine mergeSameYGroup(List<TextLine> group, float pageWidth) {
        if (group.size() == 1) return group.get(0);

        List<TextLine> sorted = new ArrayList<>(group);
        sorted.sort((a, b) -> Float.compare(a.x, b.x));

        StringBuilder mergedText = new StringBuilder();
        List<TextPosition> mergedPositions = new ArrayList<>();
        float maxFontSize = 0;
        boolean anyBold = false;

        for (int i = 0; i < sorted.size(); i++) {
            TextLine line = sorted.get(i);
            maxFontSize = Math.max(maxFontSize, line.fontSize);
            anyBold = anyBold || line.bold;

            if (i > 0) {
                TextLine prev = sorted.get(i - 1);
                // 计算前一行文本的结束 X 坐标
                float prevEndX = prev.x;
                if (!prev.positions.isEmpty()) {
                    TextPosition lastTp = prev.positions.get(prev.positions.size() - 1);
                    prevEndX = lastTp.getXDirAdj() + lastTp.getWidthDirAdj();
                } else {
                    prevEndX = prev.x + prev.text.length() * (prev.fontSize / 2f);
                }

                float gap = line.x - prevEndX;
                if (gap > 20) {
                    // 大间隙：表格列分隔
                    mergedText.append("  ");
                } else if (gap > 2) {
                    // 小间隙：普通空格
                    mergedText.append(" ");
                }
                // gap <= 2: 紧密连接，不加空格
            }

            mergedText.append(line.text);
            mergedPositions.addAll(line.positions);
        }

        boolean centered = isLineCentered(mergedPositions, pageWidth);

        return new TextLine(
                mergedText.toString(),
                maxFontSize,
                sorted.get(0).y,
                sorted.get(0).x,
                mergedPositions,
                anyBold,
                centered
        );
    }

    private String convertLinesToMarkdown(List<TextLine> lines, FontStats fontStats, String articleTitle) {
        if (lines.isEmpty()) return "";

        // 先统计正文行的常见 X 起始位置，用于判断段落缩进
        Map<Float, Long> xFreq = new HashMap<>();
        for (TextLine l : lines) {
            if (l.text.trim().isEmpty()) continue;
            float roundedX = Math.round(l.x);
            // 只统计非标题的正文行
            if (!fontStats.isH1(l.fontSize) && !fontStats.isH2(l.fontSize) && !fontStats.isH3(l.fontSize)) {
                xFreq.merge(roundedX, 1L, Long::sum);
            }
        }
        float bodyStartX = xFreq.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(0f);

        StringBuilder md = new StringBuilder();
        boolean titleSkipped = false;
        // 段落缓冲：累积同一逻辑段落的连续正文行
        StringBuilder paragraphBuf = new StringBuilder();

        int i = 0;
        while (i < lines.size()) {
            TextLine line = lines.get(i);

            // 跳过空行 → 刷新段落
            if (line.text.trim().isEmpty()) {
                flushParagraph(md, paragraphBuf);
                i++;
                continue;
            }

            // 检测表格：连续多行有多个"列"
            TableBlock table = detectTable(lines, i);
            if (table != null) {
                flushParagraph(md, paragraphBuf);
                md.append("\n\n").append(table.toMarkdown()).append("\n\n");
                i = table.endLineIndex + 1;
                continue;
            }

            String text = line.text.trim();

            // 标题识别
            String headingPrefix = null;
            boolean isLargerFont = fontStats.isH1(line.fontSize) || fontStats.isH2(line.fontSize)
                    || fontStats.isH3(line.fontSize);
            boolean isBoldAndSlightlyLarger = line.bold
                    && line.fontSize >= fontStats.bodyFontSize * 1.1f
                    && !fontStats.isH1(line.fontSize) && !fontStats.isH2(line.fontSize)
                    && text.length() <= 80;

            if ((isLargerFont || isBoldAndSlightlyLarger) && text.length() <= 80) {
                if (fontStats.isH1(line.fontSize)) {
                    headingPrefix = "# ";
                } else if (fontStats.isH2(line.fontSize)) {
                    headingPrefix = "## ";
                } else if (fontStats.isH3(line.fontSize) || isBoldAndSlightlyLarger) {
                    headingPrefix = "### ";
                }
            }

            if (headingPrefix != null) {
                flushParagraph(md, paragraphBuf);
                // 跳过正文中与文章标题重复的 H1 标题
                if ("# ".equals(headingPrefix) && !titleSkipped
                        && articleTitle != null && !articleTitle.trim().isEmpty()
                        && textContains(articleTitle, text)) {
                    titleSkipped = true;
                    i++;
                    continue;
                }
                if ("# ".equals(headingPrefix)) titleSkipped = true;
                md.append("\n\n").append(headingPrefix).append(text).append("\n\n");
            } else {
                // 加粗处理
                if (line.bold && text.length() <= 80) {
                    text = "**" + text + "**";
                }

                // 列表和章节标题 → 刷新段落后独立输出
                if (text.matches("^\\d+[.．、]\\s*.*")) {
                    flushParagraph(md, paragraphBuf);
                    md.append(text).append("\n");
                } else if (text.matches("^[-•·]\\s+.*")) {
                    flushParagraph(md, paragraphBuf);
                    md.append("- ").append(text.replaceAll("^[-•·]\\s+", "")).append("\n");
                } else if (text.matches("^[一二三四五六七八九十]+[、．.].*")
                        || text.matches("^[（(][一二三四五六七八九十]+[）)].*")) {
                    flushParagraph(md, paragraphBuf);
                    md.append("\n\n").append(text).append("\n\n");
                } else if (text.matches("^\\d+[）)].*")) {
                    flushParagraph(md, paragraphBuf);
                    md.append("\n").append(text).append("\n");
                } else {
                    // 普通正文行：判断是否为新段落的开头
                    float roundedX = Math.round(line.x);
                    // 如果行起始 X 明显大于正文基准 X（缩进超过 10pt），视为新段落开头
                    boolean isNewParagraph = roundedX > bodyStartX + 10;
                    // 如果段落缓冲已有内容且这是新段落，先刷新
                    if (isNewParagraph && paragraphBuf.length() > 0) {
                        flushParagraph(md, paragraphBuf);
                    }
                    // 累积到段落缓冲
                    if (paragraphBuf.length() > 0) {
                        paragraphBuf.append(text);
                    } else {
                        paragraphBuf.append(text);
                    }
                }
            }

            i++;
        }

        // 刷新最后可能残留的段落
        flushParagraph(md, paragraphBuf);

        return md.toString().replaceAll("\\n{3,}", "\n\n").trim();
    }

    /** 刷新段落缓冲：将累积的正文行作为一个完整段落输出 */
    private void flushParagraph(StringBuilder md, StringBuilder paragraphBuf) {
        if (paragraphBuf.length() > 0) {
            md.append(paragraphBuf.toString()).append("\n\n");
            paragraphBuf.setLength(0);
        }
    }

    // ========== 表格检测 ==========

    private static class TableBlock {
        List<String[]> rows = new ArrayList<>(); // 每行是 String[] 列
        int endLineIndex;

        String toMarkdown() {
            if (rows.isEmpty()) return "";

            // 计算最大列数
            int maxCols = rows.stream().mapToInt(r -> r.length).max().orElse(0);
            if (maxCols <= 1) return rows.stream().map(r -> String.join(" ", r)).collect(Collectors.joining("\n"));

            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < rows.size(); i++) {
                String[] row = rows.get(i);
                sb.append("| ");
                for (int j = 0; j < maxCols; j++) {
                    String cell = j < row.length ? row[j].trim() : "";
                    sb.append(cell).append(" | ");
                }
                sb.append("\n");

                // 表头分隔行
                if (i == 0) {
                    sb.append("| ");
                    for (int j = 0; j < maxCols; j++) {
                        sb.append("--- | ");
                    }
                    sb.append("\n");
                }
            }
            return sb.toString();
        }
    }

    /** 检测从 startLineIndex 开始的表格。返回 null 表示未检测到表格。 */
    private TableBlock detectTable(List<TextLine> lines, int startLineIndex) {
        if (startLineIndex >= lines.size()) return null;

        // 策略1：基于 X 坐标间隙检测列分隔
        TextLine firstLine = lines.get(startLineIndex);
        List<Float> xColBreaks = detectColumnBreaks(firstLine);

        // 策略2：基于文本中多个连续空格检测列分隔
        String[] textColumns = splitByMultipleSpaces(firstLine.text);

        // 选择列数更多的检测结果
        List<Float> colBreaks;
        int colCount;
        boolean useTextSplit;

        if (textColumns.length > 1 && (xColBreaks.size() < 2 || textColumns.length > xColBreaks.size() + 1)) {
            // 文本分割效果更好
            colCount = textColumns.length;
            useTextSplit = true;
            colBreaks = xColBreaks; // 作为备用
        } else if (xColBreaks.size() >= 2) {
            colCount = xColBreaks.size() + 1;
            useTextSplit = false;
            colBreaks = xColBreaks;
        } else if (textColumns.length >= 2) {
            colCount = textColumns.length;
            useTextSplit = true;
            colBreaks = xColBreaks;
        } else {
            return null;
        }

        TableBlock table = new TableBlock();

        // 添加第一行
        if (useTextSplit) {
            table.rows.add(textColumns);
        } else {
            table.rows.add(splitLineByColumns(firstLine, colBreaks));
        }

        int endIdx = startLineIndex;
        for (int i = startLineIndex + 1; i < lines.size() && i < startLineIndex + 50; i++) {
            TextLine line = lines.get(i);
            if (line.text.trim().isEmpty()) break;

            String[] lineTextCols = splitByMultipleSpaces(line.text);
            List<Float> lineXBreaks = detectColumnBreaks(line);

            // 判断这行是否符合表格结构
            boolean isTableRow = false;
            if (useTextSplit && lineTextCols.length >= 2
                    && Math.abs(lineTextCols.length - colCount) <= 1) {
                isTableRow = true;
            } else if (!useTextSplit && lineXBreaks.size() >= 2
                    && Math.abs(lineXBreaks.size() + 1 - colCount) <= 1) {
                isTableRow = true;
            } else if (lineTextCols.length >= 2
                    && Math.abs(lineTextCols.length - colCount) <= 1) {
                // X 坐标没检测到，但文本分割匹配
                isTableRow = true;
                useTextSplit = true;
            }

            if (isTableRow) {
                if (useTextSplit) {
                    table.rows.add(lineTextCols);
                } else {
                    table.rows.add(splitLineByColumns(line, colBreaks));
                }
                endIdx = i;
            } else if (table.rows.size() >= 2) {
                break;
            } else {
                return null;
            }
        }

        if (table.rows.size() < 2) return null;

        table.endLineIndex = endIdx;
        return table;
    }

    /** 按多个连续空格分割文本为列 */
    private String[] splitByMultipleSpaces(String text) {
        if (text == null || text.trim().isEmpty()) return new String[0];
        // 2个及以上连续空格视为列分隔
        String[] parts = text.trim().split("\\s{2,}");
        // 过滤空串
        List<String> result = new ArrayList<>();
        for (String p : parts) {
            if (!p.trim().isEmpty()) result.add(p.trim());
        }
        return result.toArray(new String[0]);
    }

    /** 检测一行文本中的列分隔点（X 坐标的大间隙） */
    private List<Float> detectColumnBreaks(TextLine line) {
        if (line.positions.size() < 2) return Collections.emptyList();

        List<Float> breaks = new ArrayList<>();
        float prevEndX = -1;

        for (int i = 0; i < line.positions.size(); i++) {
            TextPosition tp = line.positions.get(i);
            float x = tp.getXDirAdj();
            float charWidth = tp.getWidthDirAdj();

            if (prevEndX >= 0) {
                float gap = x - prevEndX;
                // 间隙大于 2 个平均字符宽度视为列分隔
                float avgCharWidth = charWidth > 0 ? charWidth : 5f;
                if (gap > avgCharWidth * 2.5) {
                    breaks.add((prevEndX + x) / 2); // 间隙中点作为分隔点
                }
            }

            prevEndX = x + charWidth;
        }

        return breaks;
    }

    /** 根据列分隔点将一行文本拆分为多个单元格 */
    private String[] splitLineByColumns(TextLine line, List<Float> colBreaks) {
        if (colBreaks.isEmpty() || line.positions.isEmpty()) {
            return new String[]{line.text};
        }

        // 排序列分隔点
        List<Float> sortedBreaks = colBreaks.stream().sorted().collect(Collectors.toList());

        // 添加边界
        List<Float> boundaries = new ArrayList<>();
        boundaries.add(0f);
        boundaries.addAll(sortedBreaks);
        boundaries.add(Float.MAX_VALUE);

        String[] cells = new String[boundaries.size() - 1];
        StringBuilder[] cellBuilders = new StringBuilder[boundaries.size() - 1];
        for (int i = 0; i < cellBuilders.length; i++) {
            cellBuilders[i] = new StringBuilder();
        }

        // 将每个字符分配到对应的单元格
        for (TextPosition tp : line.positions) {
            float x = tp.getXDirAdj();
            for (int j = 0; j < boundaries.size() - 1; j++) {
                if (x >= boundaries.get(j) && x < boundaries.get(j + 1)) {
                    cellBuilders[j].append(tp.getUnicode());
                    break;
                }
            }
        }

        for (int j = 0; j < cells.length; j++) {
            cells[j] = cellBuilders[j].toString().trim();
        }

        return cells;
    }

    // ========== 标题提取 ==========

    /** 模糊匹配：去除空格后比较，因为 PDF 提取的标题和正文中的标题可能空格不同 */
    private static boolean textContains(String longer, String shorter) {
        String l = longer.replaceAll("\\s+", "");
        String s = shorter.replaceAll("\\s+", "");
        return l.contains(s) || s.contains(l);
    }

    private String extractTitle(PDDocument document, String filename) {
        // 直接使用 PDF 文件名作为标题
        if (filename != null && !filename.isEmpty()) {
            String name = filename;
            if (name.toLowerCase().endsWith(".pdf")) {
                name = name.substring(0, name.length() - 4);
            }
            if (!name.trim().isEmpty()) {
                return name.trim();
            }
        }

        // 回退到第一页最大字号文本
        try {
            String firstPageTitle = extractFirstPageTitle(document);
            if (firstPageTitle != null && !firstPageTitle.trim().isEmpty()) {
                return firstPageTitle.trim();
            }
        } catch (Exception e) {
            log.debug("Failed to extract first page title", e);
        }

        // 回退到 PDF 元数据标题
        try {
            String title = document.getDocumentInformation() != null
                    ? document.getDocumentInformation().getTitle() : null;
            if (title != null && !title.trim().isEmpty() && !isPlaceholderTitle(title)) {
                return title.trim();
            }
        } catch (Exception e) {
            log.debug("Failed to extract PDF title from metadata", e);
        }

        // 回退到文件名
        if (filename != null && !filename.isEmpty()) {
            String name = filename;
            if (name.toLowerCase().endsWith(".pdf")) {
                name = name.substring(0, name.length() - 4);
            }
            return name;
        }
        return "未命名文章";
    }

    /** 判断是否为占位标题（元数据中常见的不具有实际意义的标题） */
    private boolean isPlaceholderTitle(String title) {
        if (title == null) return true;
        String t = title.trim().toLowerCase();
        if (t.isEmpty()) return true;
        // 常见占位标题
        if (t.equals("(anonymous)") || t.equals("anonymous") || t.equals("untitled")
                || t.equals("title") || t.equals("无标题")) return true;
        // 纯数字或过短
        if (t.length() <= 2 && t.matches("\\d+")) return true;
        return false;
    }

    /** 从第一页提取字号最大的文本作为标题 */
    private String extractFirstPageTitle(PDDocument document) throws IOException {
        List<TextLine> lines = new ArrayList<>();
        PDFTextStripper titleStripper = new PDFTextStripper() {
            private StringBuilder currentLine = new StringBuilder();
            private float currentFs = -1;
            private float currentY = -1;

            @Override
            protected void writeString(String text, List<TextPosition> textPositions) throws IOException {
                for (TextPosition tp : textPositions) {
                    float fs = tp.getFontSizeInPt();
                    if (fs <= 0) fs = tp.getYScale();
                    float y = Math.round(tp.getYDirAdj());

                    if (currentY >= 0 && Math.abs(y - currentY) > 2) {
                        if (currentLine.length() > 0) {
                            lines.add(new TextLine(currentLine.toString().trim(), currentFs, currentY, 0, Collections.emptyList(), false, false));
                        }
                        currentLine = new StringBuilder();
                        currentFs = fs;
                        currentY = y;
                    } else if (currentFs < 0) {
                        currentFs = fs;
                        currentY = y;
                    }
                    currentLine.append(tp.getUnicode());
                }
            }

            @Override
            protected void endPage(PDPage page) throws IOException {
                if (currentLine.length() > 0) {
                    lines.add(new TextLine(currentLine.toString().trim(), currentFs, currentY, 0, Collections.emptyList(), false, false));
                }
                super.endPage(page);
            }
        };

        titleStripper.setSortByPosition(true);
        titleStripper.setStartPage(1);
        titleStripper.setEndPage(1);
        titleStripper.getText(document);

        if (lines.isEmpty()) return null;

        // 找到最大字号
        float maxFs = lines.stream().map(l -> l.fontSize).max(Float::compare).orElse(0f);

        // 第一页中字号最大的前几行拼成标题
        StringBuilder title = new StringBuilder();
        for (TextLine line : lines) {
            if (line.fontSize >= maxFs * 0.95 && !line.text.trim().isEmpty()) {
                if (title.length() > 0) title.append(" ");
                title.append(line.text.trim());
                // 只取前 2 行大字文本
                if (title.length() > 100) break;
            } else if (title.length() > 0) {
                break; // 已经有大字文本，遇到小字就停止
            }
        }

        String result = title.toString().trim();
        // 标题不应太长（超过 200 字可能是正文）
        if (result.length() > 200) return null;
        return result.isEmpty() ? null : result;
    }

    // ========== 图片提取 ==========

    private List<ExtractedImage> extractImagesFromPage(PDPage page) throws IOException {
        List<ExtractedImage> images = new ArrayList<>();
        PDResources resources = page.getResources();

        if (resources == null) return images;

        for (COSName name : resources.getXObjectNames()) {
            try {
                if (resources.isImageXObject(name)) {
                    PDImageXObject image = (PDImageXObject) resources.getXObject(name);

                    int width = image.getWidth();
                    int height = image.getHeight();

                    if (width < MIN_IMAGE_DIMENSION && height < MIN_IMAGE_DIMENSION) continue;
                    if (width < ICON_MAX_DIMENSION && height < ICON_MAX_DIMENSION
                            && Math.abs(width - height) <= Math.max(width, height) * 0.2) continue;

                    BufferedImage bufferedImage = image.getImage();
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    ImageIO.write(bufferedImage, "PNG", baos);
                    byte[] imageData = baos.toByteArray();

                    if (imageData.length < 500) continue;

                    images.add(new ExtractedImage(imageData, width, height));
                }
            } catch (Exception e) {
                log.debug("Failed to extract image from PDF: {}", e.getMessage());
            }
        }

        return images;
    }

    // ========== 链接提取 ==========

    private List<String> extractLinksFromPage(PDPage page) throws IOException {
        List<String> links = new ArrayList<>();
        if (page.getAnnotations() == null) return links;

        for (PDAnnotation annotation : page.getAnnotations()) {
            if (annotation instanceof PDAnnotationLink link) {
                if (link.getAction() instanceof PDActionURI uri) {
                    String url = uri.getURI();
                    if (url != null && !url.isEmpty()) {
                        links.add("[" + url + "](" + url + ")");
                    }
                }
            }
        }
        return links;
    }

    // ========== 内嵌文件提取 ==========

    private List<AttachmentVO> extractEmbeddedFiles(PDDocument document, String articleCode) {
        List<AttachmentVO> attachments = new ArrayList<>();

        try {
            PDDocumentNameDictionary names = document.getDocumentCatalog().getNames();
            if (names == null) return attachments;

            PDEmbeddedFilesNameTreeNode embeddedFilesNode = names.getEmbeddedFiles();
            if (embeddedFilesNode == null) return attachments;

            Map<String, PDComplexFileSpecification> fileMap = embeddedFilesNode.getNames();
            if (fileMap == null) return attachments;

            for (Map.Entry<String, PDComplexFileSpecification> entry : fileMap.entrySet()) {
                try {
                    String fileName = entry.getKey();
                    PDComplexFileSpecification fileSpec = entry.getValue();
                    var embeddedFile = fileSpec.getEmbeddedFile();
                    if (embeddedFile == null) continue;

                    byte[] data = embeddedFile.toByteArray();

                    String contentType = embeddedFile.getSubtype();
                    if (contentType == null || contentType.isEmpty()) {
                        contentType = guessContentType(fileName);
                    }

                    AttachmentVO att = attachmentService.uploadFromBytes(
                            data, fileName, contentType, "article", articleCode
                    );
                    attachments.add(att);
                } catch (Exception e) {
                    log.warn("Failed to extract embedded file '{}': {}", entry.getKey(), e.getMessage());
                }
            }
        } catch (Exception e) {
            log.debug("Failed to extract embedded files from PDF: {}", e.getMessage());
        }

        return attachments;
    }

    private String guessContentType(String fileName) {
        if (fileName == null) return "application/octet-stream";
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "application/msword";
        if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) return "application/vnd.ms-excel";
        if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) return "application/vnd.ms-powerpoint";
        if (lower.endsWith(".zip")) return "application/zip";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    private record ExtractedImage(byte[] data, int width, int height) {}
}
