# CMS 内容管理系统 — 后端详细设计文档

## 1. Maven 依赖

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.5</version>
</parent>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>com.baomidou</groupId>
        <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
        <version>3.5.6</version>
    </dependency>
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
    <dependency>
        <groupId>io.minio</groupId>
        <artifactId>minio</artifactId>
        <version>8.5.7</version>
    </dependency>
    <!-- 测试依赖 -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <version>3.11.0</version>
            <configuration>
                <release>17</release>
                <annotationProcessorPaths>
                    <path>
                        <groupId>org.projectlombok</groupId>
                        <artifactId>lombok</artifactId>
                        <version>${lombok.version}</version>
                    </path>
                </annotationProcessorPaths>
            </configuration>
        </plugin>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <configuration>
                <excludeGroupIds>org.projectlombok</excludeGroupIds>
            </configuration>
        </plugin>
    </plugins>
</build>
```

## 2. 公共模块

### 2.1 BaseEntity.java

```java
@Data
public abstract class BaseEntity {
    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField(fill = FieldFill.INSERT)
    private String createdBy;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private String updatedBy;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableLogic(value = "0", delval = "1")
    private Integer delFlag;
}
```

### 2.2 Result.java

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Result<T> {
    private int code;
    private String message;
    private T data;

    public static <T> Result<T> ok() { return new Result<>(200, "ok", null); }
    public static <T> Result<T> ok(T data) { return new Result<>(200, "ok", data); }
    public static <T> Result<T> fail(String message) { return new Result<>(500, message, null); }
    public static <T> Result<T> fail(int code, String message) { return new Result<>(code, message, null); }
}
```

### 2.3 ResultCode.java

```java
public enum ResultCode {
    SUCCESS(200, "操作成功"),
    BAD_REQUEST(400, "请求参数错误"),
    NOT_FOUND(404, "资源不存在"),
    FILE_TOO_LARGE(413, "文件大小超过限制"),
    INTERNAL_ERROR(500, "系统异常");

    private final int code;
    private final String message;
}
```

### 2.4 BusinessException.java

```java
@Getter
public class BusinessException extends RuntimeException {
    private final int code;

    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }

    public BusinessException(String message) {
        this(500, message);
    }
}
```

### 2.5 GlobalExceptionHandler.java

```java
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 业务异常
    @ExceptionHandler(BusinessException.class)
    public Result<Void> handleBusinessException(BusinessException e) {
        log.warn("业务异常: code={}, message={}", e.getCode(), e.getMessage());
        return Result.fail(e.getCode(), e.getMessage());
    }

    // 参数校验异常（@Valid/@Validated 触发）
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<Void> handleValidationException(MethodArgumentNotValidException e) {
        String messages = e.getBindingResult().getFieldErrors().stream()
            .map(err -> err.getField() + ": " + err.getDefaultMessage())
            .collect(Collectors.joining("; "));
        log.warn("参数校验失败: {}", messages);
        return Result.fail(400, messages);
    }

    // 路径参数校验异常
    @ExceptionHandler(ConstraintViolationException.class)
    public Result<Void> handleConstraintViolation(ConstraintViolationException e) {
        log.warn("约束校验失败: {}", e.getMessage());
        return Result.fail(400, e.getMessage());
    }

    // 文件上传大小超限
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public Result<Void> handleMaxUploadSize(MaxUploadSizeExceededException e) {
        log.warn("文件大小超限: {}", e.getMessage());
        return Result.fail(413, "文件大小超过限制");
    }

    // 请求方法不支持
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public Result<Void> handleMethodNotSupported(HttpRequestMethodNotSupportedException e) {
        return Result.fail(405, "请求方法不支持: " + e.getMethod());
    }

    // 兜底异常
    @ExceptionHandler(Exception.class)
    public Result<Void> handleException(Exception e) {
        log.error("系统异常", e);
        return Result.fail(500, "系统异常，请联系管理员");
    }
}
```

### 2.6 MyBatisPlusConfig.java

```java
@Configuration
public class MyBatisPlusConfig {
    // 分页插件
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return interceptor;
    }

    // 自动填充处理器
    @Bean
    public MetaObjectHandler metaObjectHandler() {
        return new MetaObjectHandler() {
            @Override
            public void insertFill(MetaObject metaObject) {
                this.strictInsertFill(metaObject, "createdBy", String.class, "system");
                this.strictInsertFill(metaObject, "createdAt", LocalDateTime.class, LocalDateTime.now());
                this.strictInsertFill(metaObject, "updatedBy", String.class, "system");
                this.strictInsertFill(metaObject, "updatedAt", LocalDateTime.class, LocalDateTime.now());
            }
            @Override
            public void updateFill(MetaObject metaObject) {
                this.strictUpdateFill(metaObject, "updatedBy", String.class, "system");
                this.strictUpdateFill(metaObject, "updatedAt", LocalDateTime.class, LocalDateTime.now());
            }
        };
    }
}
```

**雪花算法配置**：业务编码字段通过 `IdWorker.getIdStr()` 在 Service 层生成。主键 id 使用数据库自增。application.yml 中配置：

```yaml
mybatis-plus:
  global-config:
    db-config:
      id-type: auto
      logic-delete-field: delFlag
      logic-delete-value: 1
      logic-not-delete-value: 0
```

### 2.7 CorsConfig.java

```java
@Configuration
@Profile("dev")  // 仅开发环境启用
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:5173", "http://localhost:3000")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
        registry.addMapping("/uploads/**")
                .allowedOrigins("http://localhost:5173", "http://localhost:3000")
                .allowedMethods("GET")
                .maxAge(3600);
    }
}
```

### 2.8 JacksonConfig.java

```java
@Configuration
public class JacksonConfig {
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        return mapper;
    }
}
```

### 2.9 WebMvcConfig.java

```java
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    @Value("${cms.storage.local.base-path:./uploads}")
    private String uploadBasePath;

    // 静态资源映射：/uploads/** → 本地文件系统
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadBasePath + "/");
    }

    // SPA Fallback：非 /api 路径转发到 index.html
    @Bean
    public ErrorPageRegistrar errorPageRegistrar() {
        return registry -> registry.addErrorPage(new ErrorPage(
            HttpStatus.NOT_FOUND, "/index.html"));
    }
}
```

## 3. DDD 聚合根边界

```
┌─────────────────────────────────────┐
│ Folder 聚合根                        │
│   Entity: Folder                     │
│   Service: FolderService             │
│   Mapper: FolderMapper               │
│   跨聚合根调用: ArticleService (@Lazy) │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Article 聚合根                       │
│   Entity: Article                    │
│   Value Objects:                     │
│     Attachment (间接)                 │
│     AttachmentRef (间接)              │
│   Service: ArticleService            │
│   Mapper: ArticleMapper              │
│   跨聚合根调用: FolderService (@Lazy)  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Attachment 聚合根（半独立）           │
│   Entity: Attachment, AttachmentRef  │
│   Service: AttachmentService         │
│   Mapper: AttachmentMapper,          │
│          AttachmentRefMapper         │
│   Service: StorageService (策略模式)  │
└─────────────────────────────────────┘
```

**跨聚合根调用规则**：
1. Folder ↔ Article 互调通过 Service 接口，不直接依赖 Mapper
2. `@Lazy` 注解打破循环依赖
3. Article 删除时级联逻辑删除 AttachmentRef（通过 AttachmentRefMapper）
4. AttachmentService 独立管理附件生命周期

## 4. 目录模块

### 4.1 Folder.java

```java
@Data
@TableName("cms_folder")
@EqualsAndHashCode(callSuper = true)
public class Folder extends BaseEntity {
    private String title;
    private String folderCode;
    private String parentFolderCode;  // -1 = 根级
    private Integer status;            // 1-正常 0-不可用
    private String description;
    private Integer sort;
}
```

### 4.2 DTO

```java
// FolderCreateDTO
public class FolderCreateDTO {
    @NotBlank(message = "标题不能为空")
    @Length(min = 3, max = 255, message = "标题长度必须在3到255个字符之间")
    private String title;
    private String parentFolderCode;  // -1或不传 = 创建根级目录
    @Length(max = 512, message = "描述长度不能超过512个字符")
    private String description;
    // sort 由后端自动计算：同级目录最大sort + 1，无需前端传值
}

// FolderUpdateDTO
public class FolderUpdateDTO {
    @NotBlank(message = "目录编码不能为空")
    private String folderCode;
    @NotBlank(message = "标题不能为空")
    @Length(min = 3, max = 255, message = "标题长度必须在3到255个字符之间")
    private String title;
    @Length(max = 512, message = "描述长度不能超过512个字符")
    private String description;
    @NotNull(message = "状态不能为空")
    private Integer status;  // 0 或 1
}

// FolderSortDTO — 拖拽排序
public class FolderSortDTO {
    @NotBlank(message = "被拖拽的目录编码不能为空")
    private String movingCode;
    @NotBlank(message = "目标位置参考目录编码不能为空")
    private String targetCode;
    @NotBlank(message = "位置不能为空")
    private String position;       // "BEFORE" 或 "AFTER"
}
```

### 4.3 VO

```java
// FolderVO
public class FolderVO {
    private String folderCode;
    private String title;
    private String parentFolderCode;
    private Integer status;
    private String description;
    private Integer sort;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer childrenCount;  // 子目录数量
}

// FolderTreeVO
public class FolderTreeVO {
    private List<FolderVO> folders;
    private List<ArticleVO> articles;
}
```

### 4.4 FolderService 接口

```java
public interface FolderService {
    List<FolderVO> getRootFolders();
    FolderTreeVO getChildren(String folderCode, boolean portalMode);
    FolderVO create(FolderCreateDTO dto);
    FolderVO update(FolderUpdateDTO dto);
    void delete(String folderCode);
    void updateSort(FolderSortDTO dto);

    /** 供其他聚合根调用 */
    FolderVO getByCode(String folderCode);
    boolean existsAndActive(String folderCode);
}
```

### 4.5 FolderMapper

```java
@Mapper
public interface FolderMapper extends BaseMapper<Folder> {
    Map<String, Integer> countChildrenByParentCodes(@Param("parentFolderCodes") List<String> parentFolderCodes);
    void incrementSortGte(@Param("parentFolderCode") String parentFolderCode,
                          @Param("thresholdSort") int thresholdSort,
                          @Param("excludeCode") String excludeCode);
    void incrementSortGt(@Param("parentFolderCode") String parentFolderCode,
                         @Param("thresholdSort") int thresholdSort,
                         @Param("excludeCode") String excludeCode);
    void updateSortByCode(@Param("folderCode") String folderCode, @Param("sort") int sort);
}
```

### 4.6 FolderMapper.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
    "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.hepr.cms.mapper.FolderMapper">
    <select id="countChildrenByParentCodes" resultType="java.util.HashMap">
        SELECT parent_folder_code AS parentFolderCode, COUNT(*) AS cnt
        FROM cms_folder
        WHERE del_flag = 0
          AND parent_folder_code IN
          <foreach collection="parentFolderCodes" item="code" open="(" separator="," close=")">
              #{code}
          </foreach>
        GROUP BY parent_folder_code
    </select>

    <update id="incrementSortGte">
        UPDATE cms_folder SET sort = sort + 1
        WHERE parent_folder_code = #{parentFolderCode}
          AND del_flag = 0
          AND sort >= #{thresholdSort}
          AND folder_code != #{excludeCode}
    </update>

    <update id="incrementSortGt">
        UPDATE cms_folder SET sort = sort + 1
        WHERE parent_folder_code = #{parentFolderCode}
          AND del_flag = 0
          AND sort > #{thresholdSort}
          AND folder_code != #{excludeCode}
    </update>

    <update id="updateSortByCode">
        UPDATE cms_folder SET sort = #{sort}
        WHERE folder_code = #{folderCode} AND del_flag = 0
    </update>
</mapper>
```

### 4.7 FolderServiceImpl 实现逻辑

| 方法 | 核心逻辑 |
|------|---------|
| getRootFolders | LambdaQueryWrapper 查 parentFolderCode='-1' AND status=1, sort ASC → countChildrenByParentCodes 一次查所有子目录数量 → 填充 childrenCount |
| getChildren | 查子目录 + 一次 GROUP BY 查 childrenCount → ArticleService.listByFolderCode 查文章 → 组装 FolderTreeVO |
| create | IdWorker.getIdStr() 生成 folderCode → 校验父目录存在 → sort = 同级最大sort+1 → INSERT |
| update | 根据 folderCode 查询 → 更新 title/description/status → 不允许修改 parentFolderCode |
| delete | 查询目录 → 检查子目录和文章 → 非空则抛异常 → 逻辑删除 |
| updateSort | 查询 moving 和 target → 校验同一层级 → BEFORE: incrementSortGte + updateSortByCode / AFTER: incrementSortGt + updateSortByCode |

### 4.8 FolderController

```java
@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {
    @GetMapping("/root")
    public Result<List<FolderVO>> getRootFolders();

    @GetMapping("/{folderCode}/children")
    public Result<FolderTreeVO> getChildren(@PathVariable String folderCode,
                                            @RequestParam(defaultValue = "false") boolean portalMode);

    @PostMapping
    public Result<FolderVO> create(@Validated @RequestBody FolderCreateDTO dto);

    @PutMapping
    public Result<FolderVO> update(@Validated @RequestBody FolderUpdateDTO dto);

    @DeleteMapping("/{folderCode}")
    public Result<Void> delete(@PathVariable String folderCode);

    @PutMapping("/sort")
    public Result<Void> updateSort(@Validated @RequestBody FolderSortDTO dto);
}
```

## 5. 文章模块

### 5.1 Article.java

```java
@Data
@TableName("cms_article")
@EqualsAndHashCode(callSuper = true)
public class Article extends BaseEntity {
    private String title;
    private String contentMd;
    private String articleCode;
    private String folderCode;
    private String status;          // DRAFT / PUBLISHED / OFFLINE
    private LocalDateTime publishedAt;
    private Integer sort;
}
```

### 5.2 ArticleStatus.java

```java
public enum ArticleStatus {
    DRAFT, PUBLISHED, OFFLINE;

    public boolean canTransitionTo(ArticleStatus target) {
        return switch (this) {
            case DRAFT -> target == PUBLISHED;
            case PUBLISHED -> target == OFFLINE || target == DRAFT;
            case OFFLINE -> target == DRAFT;
        };
    }
}
```

### 5.3 DTO

```java
// ArticleCreateDTO
public class ArticleCreateDTO {
    @NotBlank(message = "标题不能为空")
    @Length(min = 3, max = 255, message = "标题长度必须在3到255个字符之间")
    private String title;
    private String contentMd;
    @NotBlank(message = "所属目录不能为空")
    private String folderCode;
}

// ArticleUpdateDTO
public class ArticleUpdateDTO {
    @NotBlank(message = "文章编码不能为空")
    private String articleCode;
    @NotBlank(message = "标题不能为空")
    @Length(min = 3, max = 255, message = "标题长度必须在3到255个字符之间")
    private String title;
    private String contentMd;
    @NotBlank(message = "所属目录不能为空")
    private String folderCode;
}

// ArticleSortDTO
public class ArticleSortDTO {
    @NotBlank(message = "被拖拽的文章编码不能为空")
    private String movingCode;
    @NotBlank(message = "目标位置参考文章编码不能为空")
    private String targetCode;
    @NotBlank(message = "位置不能为空")
    private String position;       // "BEFORE" 或 "AFTER"
}
```

### 5.4 VO

```java
public class ArticleVO {
    private String articleCode;
    private String title;
    private String contentMd;     // 列表接口返回null，详情接口返回完整内容
    private String folderCode;
    private String status;
    private LocalDateTime publishedAt;
    private Integer sort;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String folderTitle;    // 所属目录标题（冗余字段）
}
```

### 5.5 ArticleService 接口

```java
public interface ArticleService {
    ArticleVO getDetail(String articleCode);
    ArticleVO create(ArticleCreateDTO dto);
    ArticleVO update(ArticleUpdateDTO dto);
    void publish(String articleCode);
    void offline(String articleCode);
    void delete(String articleCode);
    void updateSort(ArticleSortDTO dto);

    /** 供其他聚合根调用 */
    List<ArticleVO> listByFolderCode(String folderCode, boolean portalMode);
    long countByFolderCode(String folderCode);
    List<SearchResultVO> search(String keyword, boolean portalMode);
}
```

### 5.6 ArticleMapper

```java
@Mapper
public interface ArticleMapper extends BaseMapper<Article> {
    void incrementSortGte(@Param("folderCode") String folderCode,
                          @Param("thresholdSort") int thresholdSort,
                          @Param("excludeCode") String excludeCode);
    void incrementSortGt(@Param("folderCode") String folderCode,
                         @Param("thresholdSort") int thresholdSort,
                         @Param("excludeCode") String excludeCode);
    void updateSortByCode(@Param("articleCode") String articleCode, @Param("sort") int sort);
}
```

### 5.7 ArticleMapper.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
    "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.hepr.cms.mapper.ArticleMapper">
    <update id="incrementSortGte">
        UPDATE cms_article SET sort = sort + 1
        WHERE folder_code = #{folderCode}
          AND del_flag = 0
          AND sort >= #{thresholdSort}
          AND article_code != #{excludeCode}
    </update>

    <update id="incrementSortGt">
        UPDATE cms_article SET sort = sort + 1
        WHERE folder_code = #{folderCode}
          AND del_flag = 0
          AND sort > #{thresholdSort}
          AND article_code != #{excludeCode}
    </update>

    <update id="updateSortByCode">
        UPDATE cms_article SET sort = #{sort}
        WHERE article_code = #{articleCode} AND del_flag = 0
    </update>
</mapper>
```

### 5.8 ArticleServiceImpl 实现逻辑

| 方法 | 核心逻辑 |
|------|---------|
| getDetail | 根据 articleCode 查询 → 填充 folderTitle（FolderService.getByCode） |
| create | IdWorker.getIdStr() → FolderService.existsAndActive 校验目录 → sort = 同目录最大sort+1 → status=DRAFT → INSERT |
| update | 查询文章 → **如果当前 PUBLISHED，自动改为 DRAFT，清空 publishedAt** → 更新字段 |
| publish | 查询 → canTransitionTo(PUBLISHED) 校验 → status=PUBLISHED, publishedAt=now() |
| offline | 查询 → canTransitionTo(OFFLINE) 校验 → status=OFFLINE |
| delete | 查询 → 逻辑删除 → 逻辑删除关联的 AttachmentRef |
| updateSort | 同 FolderServiceImpl.updateSort |
| listByFolderCode | LambdaQueryWrapper + portalMode 过滤 + sort ASC |
| search | 关键词 ≥ 2 字符 → LIKE 匹配 title 和 contentMd → 生成 contentSnippet → 填充 folderTitle |

## 6. 附件模块

### 6.1 Attachment.java & AttachmentRef.java

```java
@Data
@TableName("cms_attachment")
@EqualsAndHashCode(callSuper = true)
public class Attachment extends BaseEntity {
    private String fileName;
    private String attachmentCode;
    private String fileUrl;
    private Long fileSize;
    private String storageType;   // "local"
    private String storageKey;    // "2026-04/xxx.png"
}

@Data
@TableName("cms_attachment_ref")
@EqualsAndHashCode(callSuper = true)
public class AttachmentRef extends BaseEntity {
    private String refCode;        // 引用关联实体的编码值
    private String refType;        // "article"
    private String attachmentCode; // 附件编码
}
```

### 6.2 StorageService 接口（策略模式）

```java
public interface StorageService {
    String store(MultipartFile file, String storageKey);
    Resource load(String storageKey);
    void delete(String storageKey);
    String getUrl(String storageKey);
}
```

### 6.3 LocalStorageService

- `@ConditionalOnProperty(name = "cms.storage.type", havingValue = "local", matchIfMissing = true)`
- store: 创建目录 → file.transferTo → 返回 storageKey
- load: 返回 FileSystemResource
- delete: Files.deleteIfExists
- getUrl: 返回 "/uploads/" + storageKey

### 6.4 MinioStorageService

- `@ConditionalOnProperty(name = "cms.storage.type", havingValue = "minio")`
- store: 确保 bucket → putObject → 返回 storageKey
- load: getObject → InputStreamResource
- delete: removeObject
- getUrl: getPresignedObjectUrl（7天有效）

### 6.5 MinioConfig

```java
@Configuration
@ConditionalOnProperty(name = "cms.storage.type", havingValue = "minio")
public class MinioConfig {
    @Bean
    public MinioClient minioClient(...) { ... }
}
```

### 6.6 AttachmentService 接口

```java
public interface AttachmentService {
    AttachmentVO upload(MultipartFile file, String refType, String refCode);
    AttachmentVO getByCode(String attachmentCode);
    void delete(String attachmentCode);
    List<AttachmentVO> getByRef(String refType, String refCode);
}
```

### 6.7 AttachmentServiceImpl 实现逻辑

| 方法 | 核心逻辑 |
|------|---------|
| upload | 校验文件 ≤ 10MB → 生成 storageKey = yyyy-MM/{uuid}.{ext} → storageService.store() → IdWorker.getIdStr() 生成 attachmentCode → INSERT cms_attachment → 如果有 refType+refCode 则 INSERT cms_attachment_ref |
| getByCode | 根据 attachmentCode 查询 → 不存在抛 404 |
| delete | 查询 → storageService.delete() 删除物理文件 → 逻辑删除 cms_attachment → 逻辑删除 cms_attachment_ref |
| getByRef | 查 cms_attachment_ref 获取 attachmentCode 列表 → 批量查 cms_attachment |

### 6.8 AttachmentController

```java
@RestController
@RequestMapping("/api/attachments")
@RequiredArgsConstructor
public class AttachmentController {
    @PostMapping("/upload")
    public Result<AttachmentVO> upload(@RequestParam("file") MultipartFile file,
                                       @RequestParam(required = false) String refType,
                                       @RequestParam(required = false) String refCode);

    @GetMapping("/{attachmentCode}")
    public Result<AttachmentVO> getByCode(@PathVariable String attachmentCode);

    @DeleteMapping("/{attachmentCode}")
    public Result<Void> delete(@PathVariable String attachmentCode);

    @GetMapping("/query")
    public Result<List<AttachmentVO>> getByRef(@RequestParam String refType,
                                                @RequestParam String refCode);
}
```

## 7. 搜索模块

### 7.1 SearchResultVO

```java
@Data
public class SearchResultVO {
    private String articleCode;
    private String title;
    private String folderCode;
    private String folderTitle;
    private String status;
    private LocalDateTime publishedAt;
    private String contentSnippet;   // 匹配内容片段
}
```

### 7.2 SearchController

```java
@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {
    @GetMapping
    public Result<List<SearchResultVO>> search(@RequestParam String keyword,
                                                @RequestParam(defaultValue = "true") boolean portalMode);
}
```

搜索逻辑委托 ArticleService.search() 实现，详见第 5.8 节。

## 8. 配置文件

### 8.1 application.yml

```yaml
server:
  port: 8080

spring:
  application:
    name: cms
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://localhost:3306/cms?useUnicode=true&characterEncoding=utf8mb4&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true
    username: root
    password: 123456
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 20MB
  jackson:
    date-format: yyyy-MM-dd HH:mm:ss
    time-zone: Asia/Shanghai
    default-property-inclusion: non_null

mybatis-plus:
  mapper-locations: classpath:mapper/*.xml
  global-config:
    db-config:
      id-type: auto
      logic-delete-field: delFlag
      logic-delete-value: 1
      logic-not-delete-value: 0
  configuration:
    map-underscore-to-camel-case: true

cms:
  storage:
    type: local
    local:
      base-path: ./uploads
      allowed-extensions: jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,md,zip
    minio:
      endpoint: http://localhost:9000
      access-key: minioadmin
      secret-key: minioadmin
      bucket: cms
```

### 8.2 application-dev.yml

```yaml
mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
logging:
  level:
    com.hepr.cms: DEBUG
```

### 8.3 application-test.yml（H2 测试环境）

```yaml
spring:
  datasource:
    driver-class-name: org.h2.Driver
    url: jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;MODE=MySQL
    username: sa
    password:
  h2:
    console:
      enabled: true
  sql:
    init:
      mode: always
      schema-locations: classpath:schema.sql

mybatis-plus:
  global-config:
    db-config:
      id-type: auto
      logic-delete-field: delFlag
      logic-delete-value: 1
      logic-not-delete-value: 0
  configuration:
    map-underscore-to-camel-case: true
```
