import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MetadataBar from '@/components/common/MetadataBar';

describe('MetadataBar', () => {
  it('显示最近修改时间', () => {
    render(<MetadataBar updatedAt="2026-04-28 14:30" />);
    expect(screen.getByText(/2026-04-28/)).toBeInTheDocument();
  });

  it('showAdd=true 时显示新增按钮', () => {
    render(
      <MetadataBar updatedAt="2026-04-28" showAdd onAddFolder={() => {}} onAddArticle={() => {}} />
    );
    expect(screen.getByText('新增目录')).toBeInTheDocument();
    expect(screen.getByText('新增文章')).toBeInTheDocument();
  });

  it('showAdd=false 时不显示新增按钮', () => {
    render(<MetadataBar updatedAt="2026-04-28" />);
    expect(screen.queryByText('新增目录')).not.toBeInTheDocument();
  });
});
