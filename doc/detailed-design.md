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
        <version>${minio.version}</version>
    </dependency>
    <dependency>
        <groupId>org.apache.pdfbox</groupId>
        <artifactId>pdfbox</artifactId>
        <version>3.0.4</version>
    </dependency>
    <!-- JWT -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>${jjwt.version}</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>${jjwt.version}</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>${jjwt.version}</version>
        <scope>runtime</scope>
    </dependency>
    <!-- BCrypt (standalone, no Spring Security auto-config) -->
    <dependency>
        <groupId>org.springframework.security</groupId>
        <artifactId>spring-security-crypto</artifactId>
    </dependency>
    <dependency>
        <groupId>commons-logging</groupId>
        <artifactId>commons-logging</artifactId>
        <version>1.3.1</version>
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

### 2.5 UnauthorizedException.java

```java
public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
    public UnauthorizedException() {
        super("未登录或登录已过期");
    }
}
```

### 2.6 GlobalExceptionHandler.java

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

### 2.7 MyBatisPlusConfig.java

```java
@Configuration
public class MyBatisPlusConfig {
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return interceptor;
    }

    @Bean
    public MetaObjectHandler metaObjectHandler() {
        return new MetaObjectHandler() {
            @Override
            public void insertFill(MetaObject metaObject) {
                String username = currentUser();
                this.strictInsertFill(metaObject, "createdBy", String.class, username);
                this.strictInsertFill(metaObject, "createdAt", LocalDateTime.class, LocalDateTime.now());
                this.strictInsertFill(metaObject, "updatedBy", String.class, username);
                this.strictInsertFill(metaObject, "updatedAt", LocalDateTime.class, LocalDateTime.now());
            }
            @Override
            public void updateFill(MetaObject metaObject) {
                // strictUpdateFill 仅在字段为 null 时填充，更新时需强制覆盖
                this.setFieldValByName("updatedBy", currentUser(), metaObject);
                this.setFieldValByName("updatedAt", LocalDateTime.now(), metaObject);
            }
            private String currentUser() {
                String name = UserContext.getUsername();
                return name != null ? name : "system";
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

### 2.8 CorsConfig.java

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
                .exposedHeaders("Authorization", "X-New-Token")
                .allowCredentials(true)
                .maxAge(3600);
        registry.addMapping("/uploads/**")
                .allowedOrigins("http://localhost:5173", "http://localhost:3000")
                .allowedMethods("GET")
                .maxAge(3600);
    }
}
```

### 2.9 JacksonConfig.java

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

### 2.10 WebMvcConfig.java

```java
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {
    @Value("${cms.storage.local.base-path:./uploads}")
    private String uploadBasePath;

    private final AuthInterceptor authInterceptor;

    // 静态资源映射：/uploads/** → 本地文件系统（绝对路径）
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String absolutePath = Paths.get(uploadBasePath).toAbsolutePath().normalize().toString();
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + absolutePath + "/");
    }

    // JWT 拦截器：拦截 /api/**，排除登录和静态资源
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/auth/login", "/uploads/**");
    }

    // SPA Fallback：/error 请求转发到 index.html
    @Controller
    public static class SpaErrorController implements ErrorController {
        @RequestMapping("/error")
        public Object handleError() {
            ClassPathResource indexHtml = new ClassPathResource("static/index.html");
            if (indexHtml.exists()) {
                return "forward:/index.html";
            }
            return Result.fail(404, "资源不存在");
        }
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
│   Entity: Article, ArticleVersion   │
│   Value Objects:                     │
│     Attachment (间接)                 │
│     AttachmentRef (间接)              │
│   Service: ArticleService            │
│   Mapper: ArticleMapper,             │
│          ArticleVersionMapper        │
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

┌─────────────────────────────────────┐
│ Auth 模块（认证与用户）             │
│   Entity: User                       │
│   Security: JwtTokenProvider,        │
│            AuthInterceptor,          │
│            UserContext (ThreadLocal)  │
│   Controller: AuthController,        │
│              UserController          │
│   Service: UserService               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Permission 模块（栏目权限）          │
│   Entity: FolderPermission           │
│   Controller: FolderPermissionCtrl   │
│   Service: PermissionService         │
│   Mapper: FolderPermissionMapper     │
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
    private String rootFolderCode;     // 根栏目编码（继承自最顶层父栏目）
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

// FolderMoveDTO — 跨层级移动
public class FolderMoveDTO {
    @NotBlank(message = "目录编码不能为空")
    private String folderCode;
    @NotBlank(message = "目标父目录编码不能为空")
    private String targetParentFolderCode;
    private String targetCode;     // 可选，为空则追加到末尾
    private String position;       // 可选，"BEFORE" 或 "AFTER"
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
    private String createdBy;
    private LocalDateTime updatedAt;
    private String updatedBy;
    private Integer childrenCount;  // 子目录数量
    private Integer articleCount;   // 文章数量
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
    List<FolderVO> getRootFolders(boolean portalMode);
    FolderTreeVO getChildren(String folderCode, boolean portalMode);
    List<FolderVO> getAllFoldersFlat();
    FolderVO create(FolderCreateDTO dto);
    FolderVO update(FolderUpdateDTO dto);
    void delete(String folderCode);
    void updateSort(FolderSortDTO dto);
    void moveFolder(FolderMoveDTO dto);

    /** 供其他聚合根调用 */
    FolderVO getByCode(String folderCode);
    boolean existsAndActive(String folderCode);
}
```

### 4.5 FolderMapper

```java
@Mapper
public interface FolderMapper extends BaseMapper<Folder> {
    @MapKey("parentFolderCode")
    Map<String, Map<String, Object>> countChildrenByParentCodes(@Param("parentFolderCodes") List<String> parentFolderCodes);
    void incrementSortGte(@Param("parentFolderCode") String parentFolderCode,
                          @Param("thresholdSort") int thresholdSort,
                          @Param("excludeCode") String excludeCode);
    void incrementSortGt(@Param("parentFolderCode") String parentFolderCode,
                         @Param("thresholdSort") int thresholdSort,
                         @Param("excludeCode") String excludeCode);
    Integer getMaxSort(@Param("parentFolderCode") String parentFolderCode);
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

    <select id="getMaxSort" resultType="java.lang.Integer">
        SELECT MAX(sort) FROM cms_folder
        WHERE parent_folder_code = #{parentFolderCode} AND del_flag = 0
    </select>
</mapper>
```

### 4.7 FolderServiceImpl 实现逻辑

| 方法 | 核心逻辑 |
|------|---------|
| getRootFolders | LambdaQueryWrapper 查 parentFolderCode='-1' AND status=1, sort ASC → countChildrenByParentCodes 一次查所有子目录数量 → countByFolderCodes 查文章数量 → 填充 childrenCount 和 articleCount |
| getChildren | 查子目录 + 一次 GROUP BY 查 childrenCount 和 articleCount → ArticleService.listByFolderCode 查文章 → 组装 FolderTreeVO |
| create | IdWorker.getIdStr() 生成 folderCode → 校验父目录存在 → sort = 同级最大sort+1 → INSERT |
| update | 根据 folderCode 查询 → 更新 title/description/status → 不允许修改 parentFolderCode |
| delete | 查询目录 → 检查子目录和文章 → 非空则抛异常 → 逻辑删除 |
| updateSort | 查询 moving 和 target → 校验同一层级 → BEFORE: incrementSortGte + updateSortByCode / AFTER: incrementSortGt + updateSortByCode |
| moveFolder | 查询目录 → 校验不能移动到自身/子目录 → 如果提供 targetCode+position 则定位，否则追加到末尾（getMaxSort） → 更新 parentFolderCode 和 sort |

### 4.8 FolderController

```java
@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {
    @GetMapping("/all")
    public Result<List<FolderVO>> getAllFoldersFlat();

    @GetMapping("/root")
    public Result<List<FolderVO>> getRootFolders(
            @RequestParam(defaultValue = "false") boolean portalMode);

    @GetMapping("/{folderCode}")
    public Result<FolderVO> getFolder(@PathVariable String folderCode);

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

    @PutMapping("/move")
    public Result<Void> moveFolder(@Validated @RequestBody FolderMoveDTO dto);
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
    private Integer versionNumber;   // 版本号，初始为 1
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

// ArticleMoveDTO — 跨目录移动
public class ArticleMoveDTO {
    @NotBlank(message = "文章编码不能为空")
    private String articleCode;
    @NotBlank(message = "目标目录编码不能为空")
    private String targetFolderCode;
    private String targetCode;     // 可选，为空则追加到末尾
    private String position;       // 可选，"BEFORE" 或 "AFTER"
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
    private Integer versionNumber;  // 当前版本号
    private String updatedBy;       // 最近修改人
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
    ArticleVO importPdf(MultipartFile file, String folderCode);
    ArticleVO update(ArticleUpdateDTO dto);
    void publish(String articleCode);
    void offline(String articleCode);
    void delete(String articleCode);
    void updateSort(ArticleSortDTO dto);
    void moveArticle(ArticleMoveDTO dto);
    List<ArticleVersionVO> getVersions(String articleCode);
    ArticleVersionVO getVersionDetail(String articleCode, Integer versionNumber);

    /** 供其他聚合根调用 */
    List<ArticleVO> listByFolderCode(String folderCode, boolean portalMode);
    long countByFolderCode(String folderCode);
    Map<String, Integer> countByFolderCodes(List<String> folderCodes, boolean publishedOnly);
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
    Integer getMaxSort(@Param("folderCode") String folderCode);
    @MapKey("folderCode")
    Map<String, Map<String, Object>> countByFolderCodes(@Param("folderCodes") List<String> folderCodes,
                                                         @Param("publishedOnly") boolean publishedOnly);
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

    <select id="getMaxSort" resultType="java.lang.Integer">
        SELECT MAX(sort) FROM cms_article
        WHERE folder_code = #{folderCode} AND del_flag = 0
    </select>

    <select id="countByFolderCodes" resultType="java.util.HashMap">
        SELECT folder_code AS folderCode, COUNT(*) AS cnt
        FROM cms_article
        WHERE del_flag = 0
          AND folder_code IN
          <foreach collection="folderCodes" item="code" open="(" separator="," close=")">
              #{code}
          </foreach>
          <if test="publishedOnly">
              AND status = 'PUBLISHED'
          </if>
        GROUP BY folder_code
    </select>
</mapper>
```

### 5.8 ArticleServiceImpl 实现逻辑

| 方法 | 核心逻辑 |
|------|---------|
| getDetail | 根据 articleCode 查询 → 填充 folderTitle（FolderService.getByCode） |
| create | IdWorker.getIdStr() → FolderService.existsAndActive 校验目录 → sort = 同目录最大sort+1 → status=DRAFT, versionNumber=1 → INSERT |
| update | 查询文章 → **如果当前状态非 DRAFT，先归档当前版本（archiveVersion）并 versionNumber+1，再重置为 DRAFT** → 更新 title/contentMd/folderCode |
| publish | 查询 → canTransitionTo(PUBLISHED) 校验 → status=PUBLISHED, publishedAt=now() |
| offline | 查询 → canTransitionTo(OFFLINE) 校验 → status=OFFLINE |
| delete | 查询 → 逻辑删除文章 → 逻辑删除关联的 AttachmentRef → 删除版本历史 |
| archiveVersion | 将当前文章的 title/contentMd/status/versionNumber/publishedAt 快照写入 cms_article_version 表 |
| updateSort | 同 FolderServiceImpl.updateSort |
| moveArticle | 查询文章 → 校验目标目录存在 → 如果提供 targetCode+position 则定位，否则追加到末尾（getMaxSort） → 更新 folderCode 和 sort |
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
    String store(InputStream inputStream, long size, String contentType, String storageKey);
    Resource load(String storageKey);
    void delete(String storageKey);
    String getUrl(String storageKey);
    String getStorageType();
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
    AttachmentVO uploadFromBytes(byte[] data, String fileName, String contentType, String refType, String refCode);
    AttachmentVO getByCode(String attachmentCode);
    Resource loadResource(String attachmentCode);
    void delete(String attachmentCode);
    List<AttachmentVO> getByRef(String refType, String refCode);
}
```

### 6.7 AttachmentServiceImpl 实现逻辑

| 方法 | 核心逻辑 |
|------|---------|
| upload | 校验文件 ≤ 10MB → 生成 storageKey = yyyy-MM/{uuid}.{ext} → storageService.store() → IdWorker.getIdStr() 生成 attachmentCode → INSERT cms_attachment → 如果有 refType+refCode 则 INSERT cms_attachment_ref → 填充 downloadUrl |
| uploadFromBytes | 与 upload 类似，接受 byte[] 参数，供 PDF 导入等内部服务调用 |
| getByCode | 根据 attachmentCode 查询 → 不存在抛 404 → 填充 downloadUrl |
| loadResource | 根据 attachmentCode 查询 → storageService.load() 返回 Resource 对象，供下载接口使用 |
| delete | 查询 → storageService.delete() 删除物理文件 → 逻辑删除 cms_attachment → 逻辑删除 cms_attachment_ref |
| getByRef | 查 cms_attachment_ref 获取 attachmentCode 列表 → 批量查 cms_attachment → 填充 downloadUrl |

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

    @GetMapping("/{attachmentCode}/download")
    public ResponseEntity<Resource> download(@PathVariable String attachmentCode);
}
```

### 6.9 PdfImportService

```java
public interface PdfImportService {
    PdfImportResult convertToMarkdown(MultipartFile pdfFile, String articleCode);
}
```

**PdfImportResult**:

```java
@Data
public class PdfImportResult {
    private String title;      // 提取的文章标题
    private String markdown;   // 转换后的 Markdown 内容
}
```

**PdfImportServiceImpl 实现逻辑**:

| 方法 | 核心逻辑 |
|------|--------|
| convertToMarkdown | 使用 PDFBox 加载 PDF → extractTitle() 提取标题 → 逐页提取文本和图片 → 提取内嵌图片并存储为附件（通过 AttachmentService.uploadFromBytes） → 在 Markdown 中插入图片引用 → 返回 PdfImportResult |

**图片提取规则**:
- 过滤尺寸小于 30px 的图片（图标噪音）
- 过滤尺寸小于 50px 且近似正方形的图片（小图标）
- 过滤文件小于 500 字节的图片
- 最多提取 50 张图片
- 图片通过 AttachmentService.uploadFromBytes 存储，关联到文章

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
  jwt:
    secret: cms-jwt-secret-key-2026-hepr-internal
    expiration: 604800000          # 7天 = 7*24*3600*1000 ms
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
      schema-locations: classpath:db/schema-h2.sql

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

## 9. 认证与用户模块

### 9.1 User.java

```java
@Data
@TableName("cms_user")
@EqualsAndHashCode(callSuper = true)
public class User extends BaseEntity {
    private String username;   // VARCHAR(64)，唯一索引
    private String password;   // VARCHAR(255)，BCrypt 加密
    private String role;       // ADMIN / USER
    private Integer status;    // 1-启用 0-禁用
}
```

### 9.2 DTO

```java
// LoginDTO
public class LoginDTO {
    @NotBlank private String username;
    @NotBlank private String password;
}

// UserCreateDTO
public class UserCreateDTO {
    @Size(min = 2, max = 64) private String username;
    @NotBlank private String password;
    private String role;  // 默认 "USER"
}

// UserUpdateDTO
public class UserUpdateDTO {
    @NotBlank private String username;
    private String role;
    private Integer status;
}

// UserPasswordDTO
public class UserPasswordDTO {
    private String oldPassword;
    @NotBlank private String newPassword;
}
```

### 9.3 VO

```java
// LoginVO
public class LoginVO {
    private String token;
    private String username;
    private String role;
}

// UserVO
public class UserVO {
    private String username;
    private String role;
    private Integer status;
    private LocalDateTime createdAt;
}
```

### 9.4 JwtTokenProvider

- 密钥从 `cms.jwt.secret` 读取，截断/补零到 32 字节，`Keys.hmacShaKeyFor`
- 过期时间从 `cms.jwt.expiration` 读取，默认 604800000ms（7天）
- `generateToken(username, role)` → subject=username, claim role=role
- `needsRefresh(token)` → 剩余有效期 < 86400000ms（1天）时返回 true

### 9.5 AuthInterceptor

| HTTP 方法 | 行为 |
|-----------|------|
| OPTIONS | 直接放行 |
| GET | 放行 + 尝试解析 token 设置 UserContext |
| POST/PUT/DELETE | 必须有效 JWT，否则返回 401 JSON |

- **滑动刷新**：POST/PUT/DELETE 时若 `needsRefresh`，通过 `X-New-Token` header 返回新 token
- **afterCompletion**：调用 `UserContext.clear()` 防止 ThreadLocal 泄漏

### 9.6 UserContext

```java
public class UserContext {
    private static final ThreadLocal<Context> HOLDER = new ThreadLocal<>();
    record Context(String username, String role) {}

    public static void set(String username, String role);
    public static String getUsername();
    public static String getRole();
    public static boolean isAdmin();     // "ADMIN".equals(getRole())
    public static boolean isLoggedIn();  // HOLDER.get() != null
    public static void clear();
}
```

### 9.7 UserServiceImpl 实现逻辑

| 方法 | 核心逻辑 |
|------|--------|
| login | 校验 status==1 → BCrypt matches → 生成 JWT → 返回 LoginVO |
| getCurrentUser | UserContext.getUsername() → 查库返回 UserVO |
| list | LambdaQueryWrapper 查所有用户 |
| create | 密码强度正则校验 → BCrypt 加密 → INSERT |
| update | 查询 → 更新 role/status |
| delete | admin 不可删除 → 软删除前将 username 改为 `{原名}_del_{时间戳}` 释放唯一索引 |
| resetPassword | 仅管理员操作，不校验旧密码 → 密码强度校验 → BCrypt 加密 → UPDATE |

**密码复杂度正则**：`^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$`

### 9.8 AuthController

```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @PostMapping("/login")
    public Result<LoginVO> login(@Validated @RequestBody LoginDTO dto);

    @GetMapping("/me")
    public Result<UserVO> getCurrentUser();
}
```

### 9.9 UserController

```java
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    @GetMapping
    public Result<List<UserVO>> list();

    @PostMapping
    public Result<UserVO> create(@Validated @RequestBody UserCreateDTO dto);

    @PutMapping
    public Result<UserVO> update(@Validated @RequestBody UserUpdateDTO dto);

    @DeleteMapping("/{username}")
    public Result<Void> delete(@PathVariable String username);

    @PutMapping("/{username}/password")
    public Result<Void> resetPassword(@PathVariable String username,
                                       @Validated @RequestBody UserPasswordDTO dto);
}
```

> 所有接口均需 ADMIN 角色访问（通过 AuthInterceptor + UserContext.isAdmin() 校验）

## 10. 栏目权限模块

### 10.1 FolderPermission.java

```java
@Data
@TableName("cms_folder_permission")
@EqualsAndHashCode(callSuper = true)
public class FolderPermission extends BaseEntity {
    private String username;
    private String folderCode;
}
```

### 10.2 DTO

```java
// PermissionDTO
public class PermissionDTO {
    @NotBlank private String username;
    @NotBlank private String folderCode;
}

// BatchPermissionDTO
public class BatchPermissionDTO {
    @NotBlank private String username;
    private List<String> grantCodes;
    private List<String> revokeCodes;
}
```

### 10.3 FolderPermissionVO

```java
public class FolderPermissionVO {
    private String username;
    private String folderCode;
}
```

### 10.4 PermissionServiceImpl 实现逻辑

| 方法 | 核心逻辑 |
|------|--------|
| canEditFolder | ADMIN 角色直接 true → 否则查 cms_folder_permission 表 |
| grantPermission | 级联子栏目：一次加载所有栏目构建 parentCode→children 映射，内存递归展开 → physicalDeleteBatch + insertBatch |
| revokePermission | 同上，级联撤销子栏目权限 |
| batchUpdatePermissions | grant 优先于 revoke（两者重叠时以 grant 为准） → physicalDeleteBatch + insertBatch |
| getUserPermissions | 查 cms_folder_permission WHERE username=? AND del_flag=0 |

**物理删除策略**：`physicalDeleteBatch` 绕过 `@TableLogic` 软删除，直接 `DELETE FROM`，避免唯一索引 `uk_username_folder(username, folder_code, del_flag)` 冲突

### 10.5 FolderPermissionMapper

```java
@Mapper
public interface FolderPermissionMapper extends BaseMapper<FolderPermission> {
    int physicalDeleteBatch(@Param("username") String username,
                            @Param("folderCodes") List<String> folderCodes);
    int insertBatch(@Param("perms") List<FolderPermission> perms);
}
```

### 10.6 FolderPermissionController

```java
@RestController
@RequestMapping("/api/folder-permissions")
@RequiredArgsConstructor
public class FolderPermissionController {
    @GetMapping
    public Result<List<FolderPermissionVO>> getUserPermissions(
            @RequestParam String username);

    @GetMapping("/mine")
    public Result<List<FolderPermissionVO>> getMyPermissions();

    @PostMapping("/grant")
    public Result<Void> grant(@Validated @RequestBody PermissionDTO dto);

    @PostMapping("/revoke")
    public Result<Void> revoke(@Validated @RequestBody PermissionDTO dto);

    @PostMapping("/batch")
    public Result<Void> batchUpdate(@Validated @RequestBody BatchPermissionDTO dto);
}
```

## 11. 版本管理模块

### 11.1 ArticleVersion.java

```java
@Data
@TableName("cms_article_version")
@EqualsAndHashCode(callSuper = true)
public class ArticleVersion extends BaseEntity {
    private String articleCode;
    private String title;
    private String contentMd;
    private String status;
    private Integer versionNumber;
    private LocalDateTime publishedAt;
}
```

### 11.2 ArticleVersionVO

```java
public class ArticleVersionVO {
    private Integer versionNumber;
    private String status;
    private String contentMd;
    private String title;
    private String createdBy;
    private LocalDateTime createdAt;
}
```

### 11.3 版本归档流程

```
用户编辑文章(PUT) → 检查当前状态
  ├─ DRAFT → 直接更新字段
  └─ PUBLISHED/OFFLINE →
       ① archiveVersion(): 快照写入 cms_article_version
       ② versionNumber + 1
       ③ 重置 status=DRAFT, publishedAt=null
       ④ 更新 title/contentMd/folderCode
```

### 11.4 ArticleController 版本接口

```java
@GetMapping("/{articleCode}/versions")
public Result<List<ArticleVersionVO>> getVersions(@PathVariable String articleCode);

@GetMapping("/{articleCode}/versions/{versionNumber}")
public Result<ArticleVersionVO> getVersionDetail(@PathVariable String articleCode,
                                                  @PathVariable Integer versionNumber);
```

## 12. 数据库迁移

迁移文件位于 `src/main/resources/db/migration/`：

| 文件 | 说明 |
|------|------|
| V20260605_001__ddl_user_permission_version.sql | 创建 cms_user、cms_folder_permission、cms_article_version；给 cms_folder 加 root_folder_code；给 cms_article 加 version_number + idx_folder_status 索引 |
| V20260605_002__dml_init_admin_backfill_folder.sql | 插入 admin 用户（密码 Hyt7SM5@42）；回填 cms_folder.root_folder_code |
| V20260605_003__ddl_cleanup_redundant_indexes.sql | 清理冗余索引（idx_status、idx_folder_code 等） |

H2 测试 Schema 位于 `src/main/resources/db/schema-h2.sql`，包含全部 7 张表的 H2 兼容 DDL + admin 初始化 INSERT。

