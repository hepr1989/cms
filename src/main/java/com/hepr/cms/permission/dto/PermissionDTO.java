package com.hepr.cms.permission.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PermissionDTO {

    @NotBlank(message = "用户名不能为空")
    private String username;

    @NotBlank(message = "栏目编码不能为空")
    private String folderCode;
}
