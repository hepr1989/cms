package com.hepr.cms.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserUpdateDTO {

    @NotBlank(message = "用户名不能为空")
    private String username;

    private String role;

    private Integer status;
}
