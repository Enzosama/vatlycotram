import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  BookOpen, 
  FileText, 
  Play, 
  Pause, 
  Volume2, 
  Download, 
  Copy, 
  Check, 
  UploadCloud, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw,
  ExternalLink,
  Layers,
  HelpCircle,
  X
} from 'lucide-react';
import { NotebookLMProject, MindMapNode } from '../types';
import { NOTEBOOKLM_PROJECTS } from '../data/notebookLMData';

interface NotebookLMMindmapProps {
  initialProjectId?: string;
  onSelectCourse?: (courseId: string) => void;
}

export const NotebookLMMindmap: React.FC<NotebookLMMindmapProps> = ({
  initialProjectId,
  onSelectCourse,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || NOTEBOOKLM_PROJECTS[0].id
  );
  const [projects, setProjects] = useState<NotebookLMProject[]>(NOTEBOOKLM_PROJECTS);
  const [activeNode, setActiveNode] = useState<MindMapNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(32);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'card'>('tree');

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  // Toggle node collapse
  const toggleCollapse = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  // Quick import parser for user-pasted NotebookLM markdown
  const handleImportNotebookLM = () => {
    if (!importText.trim()) return;

    try {
      const lines = importText.split('\n').filter((l) => l.trim().length > 0);
      const rootTitle = lines[0].replace(/^#+\s*/, '').replace(/^-\s*/, '') || 'Sơ đồ tư duy NotebookLM mới';

      // Simple recursive hierarchy builder from indent levels
      const rootNode: MindMapNode = {
        id: 'custom-root-' + Date.now(),
        label: rootTitle,
        category: 'core',
        summary: 'Sơ đồ được nhập trực tiếp từ bản thảo NotebookLM.',
        children: [],
      };

      const stack: { node: MindMapNode; depth: number }[] = [{ node: rootNode, depth: -1 }];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const matchIndent = line.match(/^(\s*)/);
        const indentCount = matchIndent ? matchIndent[1].length : 0;
        const text = line.trim().replace(/^[-*+]\s*/, '').replace(/^#+\s*/, '');

        if (!text) continue;

        const newNode: MindMapNode = {
          id: `custom-node-${i}-${Date.now()}`,
          label: text,
          category: indentCount <= 2 ? 'concept' : indentCount <= 4 ? 'detail' : 'formula',
          children: [],
        };

        while (stack.length > 1 && stack[stack.length - 1].depth >= indentCount) {
          stack.pop();
        }

        const parent = stack[stack.length - 1].node;
        if (!parent.children) parent.children = [];
        parent.children.push(newNode);

        stack.push({ node: newNode, depth: indentCount });
      }

      const newProj: NotebookLMProject = {
        id: 'project-' + Date.now(),
        title: rootTitle,
        courseId: 'custom-course',
        subject: 'Tài liệu cá nhân',
        sourceCount: 3,
        audioSummaryDuration: '10:00',
        overview: 'Dữ liệu sơ đồ tư duy được đồng bộ từ nguồn NotebookLM của bạn.',
        keyInsights: ['Trích xuất trực quan từ tài liệu học tập cá nhân.'],
        rootNode,
        rawMarkdownExport: importText,
      };

      setProjects([newProj, ...projects]);
      setSelectedProjectId(newProj.id);
      setShowImportModal(false);
      setImportText('');
    } catch (err) {
      console.error(err);
      alert('Không thể định dạng văn bản. Vui lòng kiểm tra lại cấu trúc markdown (dấu gạch đầu dòng - hoặc thụt lề).');
    }
  };

  const copyMarkdown = () => {
    if (currentProject.rawMarkdownExport) {
      navigator.clipboard.writeText(currentProject.rawMarkdownExport);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    }
  };

  // Category badge colors
  const getCategoryStyles = (category?: string) => {
    switch (category) {
      case 'core':
        return 'bg-blue-600 text-white border-blue-700';
      case 'concept':
        return 'bg-sky-50 text-sky-900 border-sky-300 hover:bg-sky-100';
      case 'formula':
        return 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100';
      case 'source':
        return 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100';
      default:
        return 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50';
    }
  };

  // Recursive Tree Node Renderer
  const renderNode = (node: MindMapNode, depth: number = 0) => {
    const isCollapsed = collapsedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = activeNode?.id === node.id;
    const isMatchQuery = searchQuery && node.label.toLowerCase().includes(searchQuery.toLowerCase());

    return (
      <div key={node.id} className="relative flex flex-col items-start my-1.5 transition-all">
        <div
          onClick={() => setActiveNode(node)}
          className={`group flex items-center gap-2 px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer select-none ${getCategoryStyles(
            node.category
          )} ${isSelected ? 'ring-3 ring-blue-500/40 border-blue-500' : ''} ${
            isMatchQuery ? 'ring-2 ring-yellow-400 bg-yellow-100 text-yellow-900' : ''
          }`}
        >
          {hasChildren && (
            <button
              onClick={(e) => toggleCollapse(node.id, e)}
              className="p-0.5 hover:bg-black/10 rounded transition"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          <span className="leading-snug">{node.label}</span>

          {node.citations && node.citations.length > 0 && (
            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-mono font-normal">
              [{node.citations.length} nguồn]
            </span>
          )}
        </div>

        {/* Child branches */}
        {hasChildren && !isCollapsed && (
          <div className="pl-6 sm:pl-8 ml-3 sm:ml-4 border-l-2 border-blue-200/80 flex flex-col space-y-1 mt-1">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Banner: Sơ đồ tư duy Vật lý - Tone màu xanh nhạt / xanh dương trang nhã */}
      <div className="mb-6 bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 text-white rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="text-xs font-semibold text-sky-100 mb-1.5 uppercase tracking-wide">
              Hệ thống tóm tắt & tra cứu công thức
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Sơ Đồ Phân Nhánh & Cẩm Nang Ôn Tập
            </h1>
            <p className="text-xs sm:text-sm text-sky-100 mt-1 max-w-2xl leading-relaxed">
              Hệ thống hóa toàn bộ công thức, định luật và hiện tượng Vật lý theo cấu trúc phân nhánh tương tác, phục vụ tra cứu nhanh và ghi nhớ dài hạn.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-medium px-3.5 py-2 rounded-lg border border-white/20 transition-colors"
            >
              <UploadCloud className="w-4 h-4 text-sky-200" />
              <span>Dán dàn ý NotebookLM</span>
            </button>

            <button
              onClick={copyMarkdown}
              className="flex items-center gap-1.5 bg-white text-blue-700 hover:bg-sky-50 text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition-colors"
            >
              {copiedNotification ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Đã sao chép!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-blue-600" />
                  <span>Sao chép Markdown</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* NotebookLM Audio Overview Simulator */}
        <div className="mt-5 pt-4 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/10 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlayingAudio(!isPlayingAudio)}
              className="w-9 h-9 rounded-full bg-white text-blue-700 hover:bg-sky-50 flex items-center justify-center transition-colors shrink-0 shadow-xs"
            >
              {isPlayingAudio ? (
                <Pause className="w-4 h-4 fill-current text-blue-700" />
              ) : (
                <Play className="w-4 h-4 ml-0.5 fill-current text-blue-700" />
              )}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">
                  Audio Overview (Bản tóm tắt âm thanh)
                </span>
                <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded font-mono">
                  {currentProject.audioSummaryDuration}
                </span>
              </div>
              <p className="text-[11px] text-sky-100">
                {isPlayingAudio
                  ? 'Đang phát bản ghi âm tóm tắt kiến thức...'
                  : 'Bấm để nghe bản tóm tắt âm thanh tổng hợp từ tài liệu'}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-48 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-sky-200 shrink-0" />
            <div className="flex-1 bg-white/20 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full bg-white transition-all ${
                  isPlayingAudio ? 'w-2/3 animate-pulse' : 'w-1/3'
                }`}
              ></div>
            </div>
            <span className="text-[10px] text-blue-200 font-mono">
              {isPlayingAudio ? '04:15' : '00:00'}
            </span>
          </div>
        </div>
      </div>

      {/* Project Selector Tabs */}
      <div className="flex items-center justify-between gap-3 mb-6 border-b border-slate-200 pb-3 overflow-x-auto">
        <div className="flex items-center gap-2">
          {projects.map((proj) => (
            <button
              key={proj.id}
              onClick={() => {
                setSelectedProjectId(proj.id);
                setActiveNode(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedProjectId === proj.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{proj.subject}: {proj.title.split(':')[0]}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setViewMode(viewMode === 'tree' ? 'card' : 'tree')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{viewMode === 'tree' ? 'Chuyển dạng Thẻ' : 'Chuyển dạng Cây'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left / Center: Interactive Canvas */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col min-h-[400px] sm:min-h-[550px]">
          {/* Canvas Toolbar */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Lọc từ khóa trong sơ đồ..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
                className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-500 font-mono px-1">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
                className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg"
                title="Phóng to"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoomLevel(1);
                  setCollapsedNodes({});
                  setSearchQuery('');
                }}
                className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg ml-1"
                title="Đặt lại"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive Mindmap Visualizer */}
          <div className="flex-1 p-6 overflow-auto bg-slate-50/40 relative">
            {/* Background grid pattern */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                backgroundSize: '16px 16px'
              }}
            ></div>

            <div 
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
              className="transition-transform duration-150"
            >
              {viewMode === 'tree' ? (
                renderNode(currentProject.rootNode)
              ) : (
                /* Card View Alternative */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentProject.rootNode.children?.map((concept) => (
                    <div
                      key={concept.id}
                      onClick={() => setActiveNode(concept)}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs cursor-pointer transition"
                    >
                      <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center justify-between">
                        {concept.label}
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                        {concept.summary || 'Nhánh khái niệm trọng tâm'}
                      </p>
                      <div className="text-[11px] text-blue-600 font-semibold">
                        {concept.children?.length || 0} chuyên mục con
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer stats */}
          <div className="px-4 py-2 border-t border-slate-200 bg-white flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Nguồn cấp: <strong className="text-slate-800">{currentProject.sourceCount} tài liệu SGK & đề thi</strong>
            </span>
            <span>Bấm vào bất kỳ nhánh nào để xem trích dẫn & cẩm nang chi tiết</span>
          </div>
        </div>

        {/* Right: Detailed Node Inspector & NotebookLM Insights */}
        <div className="lg:col-span-4 space-y-4">
          {/* Active Node Detail Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Chi Tiết Trọng Tâm Kiến Thức
              </h2>
            </div>

            {activeNode ? (
              <div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">
                  {activeNode.label}
                </h3>
                <div className="mb-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryStyles(activeNode.category)}`}>
                    {activeNode.category?.toUpperCase() || 'KHÁI NIỆM'}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">
                    Tóm lược trí tuệ nhân tạo (NotebookLM AI Synthesis):
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {activeNode.summary || 'Khái niệm được kết nối trực tiếp từ cấu trúc đề thi và tài liệu học liệu chuẩn.'}
                  </p>
                </div>

                {activeNode.citations && activeNode.citations.length > 0 && (
                  <div className="mb-4">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                      Trích dẫn nguồn học liệu (Citations):
                    </span>
                    <div className="space-y-1">
                      {activeNode.citations.map((cite, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-100"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{cite}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeNode.children && activeNode.children.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                      Các nhánh trực thuộc ({activeNode.children.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeNode.children.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => setActiveNode(sub)}
                          className="text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 px-2 py-1 rounded-lg border border-slate-200 transition text-left"
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <BrainCircuit className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                <p className="text-xs font-medium text-slate-600">
                  Chưa chọn nút nào trong sơ đồ.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Nhấp vào một khái niệm hoặc nhánh trên sơ đồ để xem trích dẫn và lời giải chi tiết.
                </p>
              </div>
            )}
          </div>

          {/* Key Insights Overview */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Điểm Trọng Tâm Cần Ghi Nhớ (Key Takeaways)</span>
            </h3>

            <ul className="space-y-2.5">
              {currentProject.keyInsights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white w-full max-w-xl rounded-xl shadow-lg border border-slate-200 p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-blue-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Dán Dữ Liệu Sơ Đồ Tư Duy từ NotebookLM
                </h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Mở NotebookLM (notebooklm.google.com), chọn phần Studio hoặc Chat để sao chép dàn ý / sơ đồ tư duy dạng gạch đầu dòng Markdown rồi dán vào đây:
            </p>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`# Chủ đề: Lịch Sử Thế Giới Hiện Đại\n- Chiến tranh lạnh\n  - Khủng hoảng tên lửa Cuba\n  - Bức tường Berlin\n- Toàn cầu hóa\n  - Khối kinh tế EU & ASEAN`}
              rows={8}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:border-blue-600 mb-4"
            ></textarea>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleImportNotebookLM}
                className="px-4 py-2 text-xs font-medium bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors"
              >
                Tạo sơ đồ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
