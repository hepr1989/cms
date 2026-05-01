package com.hepr.cms.article.enums;

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
