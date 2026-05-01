import type { TreeDataNode } from '@/types';

export function findNode(nodes: TreeDataNode[], key: string): TreeDataNode | null {
  for (const node of nodes) {
    if (node.key === key) return node;
    if (node.children) {
      const found = findNode(node.children, key);
      if (found) return found;
    }
  }
  return null;
}

export function getParentKey(nodes: TreeDataNode[], key: string): string | null {
  for (const node of nodes) {
    if (node.children) {
      for (const child of node.children) {
        if (child.key === key) return node.key;
      }
      const found = getParentKey(node.children, key);
      if (found) return found;
    }
  }
  return null;
}

export function getCodeFromKey(key: string): string {
  return key.replace(/^(folder|article)-/, '');
}

export function getTypeFromKey(key: string): 'folder' | 'article' {
  return key.startsWith('folder-') ? 'folder' : 'article';
}
