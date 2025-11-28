export type FileNode = {
  id: string
  name: string
  type: 'file' | 'folder'
  language?: string
  content?: string
  children?: FileNode[]
}

export const fileTree: FileNode[] = [
  {
    id: 'src',
    name: 'src',
    type: 'folder',
    children: [
      {
        id: 'src/main',
        name: 'main.tsx',
        type: 'file',
        language: 'tsx',
        content: `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)`,
      },
      {
        id: 'src/components',
        name: 'components',
        type: 'folder',
        children: [
          {
            id: 'src/components/chat',
            name: 'Chat.tsx',
            type: 'file',
            language: 'tsx',
            content: `export type Message = {
  id: string
  role: 'user' | 'assistant' | 'reasoning'
  content: string
}`,
          },
          {
            id: 'src/components/file-viewer',
            name: 'FileViewer.tsx',
            type: 'file',
            language: 'tsx',
            content: `export const FileViewer = () => {
  return <div>File viewer</div>
}`,
          },
        ],
      },
      {
        id: 'src/styles',
        name: 'styles',
        type: 'folder',
        children: [
          {
            id: 'src/styles/index.css',
            name: 'index.css',
            type: 'file',
            language: 'css',
            content: `@tailwind base;
@tailwind components;
@tailwind utilities;`,
          },
        ],
      },
    ],
  },
  {
    id: 'public',
    name: 'public',
    type: 'folder',
    children: [
      {
        id: 'public/index',
        name: 'index.html',
        type: 'file',
        language: 'html',
        content: `<html>
  <body>
    <div id="root"></div>
  </body>
</html>`,
      },
    ],
  },
]

