import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
 
import Filter from './Filter/Filter';
import QueryEditor from './QueryEditor/QueryEditor';
import ResultsArea from './ResultsArea';
import LogsPanel from './LogsPanel';

export default function MainPanels({ tableData }) {
  return (
    <PanelGroup direction="vertical">
      <Panel defaultSize={10} minSize={10}>
        {tableData && <Filter tableData={tableData} />}
      </Panel>

      <PanelResizeHandle className="h-2 bg-gray-700 hover:bg-blue-500" />

      <Panel defaultSize={20} minSize={10}>
        <QueryEditor />
      </Panel>

      <PanelResizeHandle className="h-2 bg-gray-700 hover:bg-blue-500" />

      <Panel defaultSize={50} minSize={30}>
        <ResultsArea />
      </Panel>

      <PanelResizeHandle className="h-2 bg-gray-700 hover:bg-blue-500" />

      <Panel defaultSize={20} minSize={10}>
        <div className="h-full bg-gray-950 text-gray-300 p-3 font-mono text-sm overflow-auto border-t border-gray-800">
          <h3 className="text-gray-400 text-xs mb-2 uppercase tracking-wide">
            Logs
          </h3>
          <LogsPanel />
        </div>
      </Panel>
    </PanelGroup>
  );
}
