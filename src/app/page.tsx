"use client";

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ChessBoard } from "@/components/ChessBoard";
import { MoveList } from "@/components/MoveList";
import { ChatWindow } from "@/components/ChatWindow";

export default function Home() {
  return (
    <main className="h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <ResizablePanelGroup orientation="horizontal" className="h-full">
        {/* Left panel - Chessboard */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full bg-zinc-900/50">
            <ChessBoard />
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-1 bg-zinc-800 hover:bg-amber-500/50 transition-colors data-[resize-handle-state=drag]:bg-amber-500" />

        {/* Right panel - Move list and Chat */}
        <ResizablePanel defaultSize={50} minSize={25}>
          <ResizablePanelGroup orientation="vertical" className="h-full">
            {/* Move list */}
            <ResizablePanel defaultSize={45} minSize={15}>
              <div className="h-full bg-zinc-900/30 border-l border-zinc-800">
                <MoveList />
              </div>
            </ResizablePanel>

            <ResizableHandle className="h-1 bg-zinc-800 hover:bg-amber-500/50 transition-colors data-[resize-handle-state=drag]:bg-amber-500" />

            {/* Chat window - larger default */}
            <ResizablePanel defaultSize={55} minSize={25}>
              <div className="h-full bg-zinc-900/30 border-l border-zinc-800">
                <ChatWindow />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}
