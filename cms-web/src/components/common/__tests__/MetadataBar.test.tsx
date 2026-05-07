import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MetadataBar from '@/components/common/MetadataBar';

describe('MetadataBar', () => {
  /** 展示最近修改时间文案 */
  it('rendersLastUpdatedTimestamp', () => {
    render(<MetadataBar updatedAt="2026-04-28 14:30" />);
    expect(screen.getByText(/2026-04-28/)).toBeInTheDocument();
  });

  /** showAdd 为 true 时渲染「新增栏目 / 新增文章」 */
  it('showsAddButtonsWhenShowAddTrue', () => {
    render(
      <MetadataBar updatedAt="2026-04-28" showAdd onAddFolder={() => {}} onAddArticle={() => {}} />
    );
    expect(screen.getByText('新增栏目')).toBeInTheDocument();
    expect(screen.getByText('新增文章')).toBeInTheDocument();
  });

  /** showAdd 为 false 时不渲染新增按钮 */
  it('hidesAddButtonsWhenShowAddFalse', () => {
    render(<MetadataBar updatedAt="2026-04-28" />);
    expect(screen.queryByText('新增栏目')).not.toBeInTheDocument();
  });
});
