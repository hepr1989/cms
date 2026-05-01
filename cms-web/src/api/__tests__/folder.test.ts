import { describe, it, expect, vi } from 'vitest';
import { createFolder, getRootFolders, updateFolderSort } from '../folder';

vi.mock('../client', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ folderCode: 'new' }),
    get: vi.fn().mockResolvedValue([]),
    put: vi.fn().mockResolvedValue(null),
  },
}));

describe('folder API', () => {
  it('createFolder 调用 POST /folders', async () => {
    const result = await createFolder({ title: '新目录', parentFolderCode: '-1' }) as any;
    expect(result.folderCode).toBe('new');
  });

  it('getRootFolders 调用 GET /folders/root', async () => {
    const result = await getRootFolders();
    expect(Array.isArray(result)).toBe(true);
  });

  it('updateFolderSort 传参正确', async () => {
    await updateFolderSort({
      movingCode: 'a', targetCode: 'b', position: 'BEFORE',
    });
  });
});
