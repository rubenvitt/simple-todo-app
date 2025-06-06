import { Button, Card } from 'antd'
import { BulbOutlined, BulbFilled } from '@ant-design/icons'
import { useTheme } from './contexts/ThemeContext'
import './App.css'

function App() {
  const { isDarkMode, toggleTheme } = useTheme()

  return (
      <div className={`p-ant-lg min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-neutral-950' : 'bg-neutral-50'}`}>
        <div className="max-w-2xl mx-auto">
          <Card title="🎨 Integrated Theme System" className="shadow-ant-lg border-0">
            <div className="space-y-ant">
              <Button
                type="primary"
                size="large"
                icon={isDarkMode ? <BulbFilled /> : <BulbOutlined />}
                onClick={toggleTheme}
                className="mb-ant"
              >
                Switch to {isDarkMode ? 'Light' : 'Dark'} Theme
              </Button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-ant">
                <div className="p-ant bg-primary-50 dark:bg-primary-900 rounded-ant border border-primary-200 dark:border-primary-700">
                  <h3 className="text-sm font-semibold text-primary-800 dark:text-primary-200 mb-2">
                    Primary
                  </h3>
                  <div className="w-6 h-6 bg-primary-500 rounded-full"></div>
                </div>
                
                <div className="p-ant bg-success-50 dark:bg-success-900 rounded-ant border border-success-200 dark:border-success-700">
                  <h3 className="text-sm font-semibold text-success-800 dark:text-success-200 mb-2">
                    Success
                  </h3>
                  <div className="w-6 h-6 bg-success-500 rounded-full"></div>
                </div>
                
                <div className="p-ant bg-warning-50 dark:bg-warning-900 rounded-ant border border-warning-200 dark:border-warning-700">
                  <h3 className="text-sm font-semibold text-warning-800 dark:text-warning-200 mb-2">
                    Warning
                  </h3>
                  <div className="w-6 h-6 bg-warning-500 rounded-full"></div>
                </div>
                
                <div className="p-ant bg-error-50 dark:bg-error-900 rounded-ant border border-error-200 dark:border-error-700">
                  <h3 className="text-sm font-semibold text-error-800 dark:text-error-200 mb-2">
                    Error
                  </h3>
                  <div className="w-6 h-6 bg-error-500 rounded-full"></div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-ant mt-ant-lg">
                <div className="p-ant-lg bg-neutral-100 dark:bg-neutral-800 rounded-ant">
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-ant-sm">
                    ✅ Ant Design
                  </h3>
                  <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                    <li>• ConfigProvider theme</li>
                    <li>• Synchronized colors</li>
                    <li>• Dark mode support</li>
                  </ul>
                </div>
                
                <div className="p-ant-lg bg-neutral-100 dark:bg-neutral-800 rounded-ant">
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-ant-sm">
                    ✅ Tailwind CSS
                  </h3>
                  <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                    <li>• Custom color palette</li>
                    <li>• Consistent spacing</li>
                    <li>• Shared design tokens</li>
                  </ul>
                </div>
              </div>
              
              <div className="text-center pt-ant-lg border-t border-neutral-200 dark:border-neutral-700">
                <p className="text-neutral-600 dark:text-neutral-400">
                  🎨 Harmonized design system with shared tokens
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-2">
                  CSS variables • Color harmony • Theme persistence • System preference detection
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
  )
}

export default App
