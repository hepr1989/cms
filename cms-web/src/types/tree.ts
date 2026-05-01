export type TreeNodeType = 'folder' | 'article';
export type TreeNodeKey = string;

export interface TreeDataNode {
  key: TreeNodeKey;
  title: string;
  type: TreeNodeType;
  isLeaf: boolean;
  parentKey: string;
  code: string;
  status?: number | string;
  sort?: number;
  children?: TreeDataNode[];
  hasChildren?: boolean;
}
