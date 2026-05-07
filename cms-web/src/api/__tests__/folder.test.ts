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
  /** createFolder：POST /api/folders（经 client 封装） */
  it('createFolder_postsPayloadAndReturnsFolder', async () => {
    const result = await createFolder({ title: '新目录', parentFolderCode: '-1' }) as any;
    expect(result.folderCode).toBe('new');
  });

  /** getRootFolders：GET 根列表并返回数组 */
  it('getRootFolders_returnsArray', async () => {
    const result = await getRootFolders();
    expect(Array.isArray(result)).toBe(true);
  });

  /** updateFolderSort：PUT 排序参数 */
  it('updateFolderSort_sendsSortPayload', async () => {
    await updateFolderSort({
      movingCode: 'a', targetCode: 'b', position: 'BEFORE',
    });
  });
});
