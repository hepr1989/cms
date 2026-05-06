package com.hepr.cms.article.service.pdfimport;

import java.text.Normalizer;
import java.util.Map;

public class PdfContentCleaner {

    /** PDF 提取常见的连字伪影映射 */
    private static final Map<String, String> LIGATURE_FIXES = Map.of(
            "\uFB01", "fi",
            "\uFB02", "fl",
            "\uFB03", "ffi",
            "\uFB04", "ffl",
            "\uFB00", "ff",
            "\uFB05", "st"
    );

    /**
     * 清洗 PDF 提取的 Markdown 内容：
     * 1. 修复连字伪影
     * 2. Unicode NFC 规范化
     * 3. 过滤控制字符
     * 4. 移除重复乱码字符序列
     */
    public static String clean(String markdown) {
        if (markdown == null || markdown.isEmpty()) return "";

        // 1. 修复连字伪影
        for (Map.Entry<String, String> entry : LIGATURE_FIXES.entrySet()) {
            markdown = markdown.replace(entry.getKey(), entry.getValue());
        }

        // 2. Unicode NFC 规范化
        markdown = Normalizer.normalize(markdown, Normalizer.Form.NFC);

        // 3. 过滤控制字符（保留 \n \r \t）
        StringBuilder sb = new StringBuilder(markdown.length());
        for (int i = 0; i < markdown.length(); i++) {
            char c = markdown.charAt(i);
            if (c == '\n' || c == '\r' || c == '\t' || !Character.isISOControl(c)) {
                sb.append(c);
            }
        }
        markdown = sb.toString();

        // 4. 移除重复乱码字符序列（3个及以上相同的非文字字符，排除常见标点 ... 和 ---）
        markdown = markdown.replaceAll("([^\\w\\s\\n\\r.\\-#|])\\1{2,}", "");

        // 5. 清理多余空行（3个以上连续空行压缩为2个）
        markdown = markdown.replaceAll("\\n{4,}", "\n\n\n");

        return markdown.trim();
    }
}
