import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LeadManagement from './components/LeadManagement';
import EmailCampaign from './components/EmailCampaign';
import Analytics from './components/Analytics';
import UseCases from './components/UseCases';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'leads':
        return <LeadManagement />;
      case 'email':
        return <EmailCampaign />;
      case 'use-cases':
        return <UseCases />;
      case 'analytics':
        return <Analytics />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Sidebar - Hidden on mobile, shown on md+ */}
      <div className="hidden md:block">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} isMobile={false} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          currentPage={currentPage}
          onNavigate={(page) => {
            setCurrentPage(page);
            setSidebarOpen(false);
          }}
          isMobile={true}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full overflow-auto">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between p-4">
            <h1 className="font-bold text-lg gradient-text hidden xs:block">AI Sales</h1>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-4 sm:p-6 md:p-8">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
