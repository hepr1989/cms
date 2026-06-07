package com.hepr.cms.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserCreateDTO {

    @NotBlank(message = "用户名不能为空")
    @Size(min = 2, max = 64, message = "用户名长度2-64")
    private String username;

    @NotBlank(message = "密码不能为空")
    private String password;

    private String role = "USER";
}
