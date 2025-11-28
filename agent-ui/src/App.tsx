import Chat from './components/chat/Chat'
import FileViewer from './components/file-viewer/FileViewer'

function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      {/* Left Section: Chat */}
      <div className="h-full w-1/2 border-r-4 border-black">
        <Chat className="h-full w-full" />
      </div>
      
      {/* Right Section: File Viewer */}
      <div className="h-full w-1/2 bg-white">
        <FileViewer />
      </div>
    </div>
  )
}

export default App
