package com.hepr.cms.common.util;

import org.springframework.beans.BeanUtils;

public class BeanCopyUtil {

    public static <T> T copyProperties(Object source, Class<T> targetClass) {
        try {
            T target = targetClass.getDeclaredConstructor().newInstance();
            BeanUtils.copyProperties(source, target);
            return target;
        } catch (Exception e) {
            throw new RuntimeException("Bean copy failed", e);
        }
    }
}
