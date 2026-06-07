package com.hepr.cms.permission.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class BatchPermissionDTO {

    @NotBlank(message = "用户名不能为空")
    private String username;

    private List<String> grantCodes;

    private List<String> revokeCodes;
}
