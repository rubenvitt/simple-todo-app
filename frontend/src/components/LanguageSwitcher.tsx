import { Select, Space } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from '../hooks/useTranslation';

const { Option } = Select;

interface Language {
  code: string;
  label: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

export const LanguageSwitcher = () => {
  const { language, changeLanguage } = useTranslation('common');

  const handleLanguageChange = (value: string) => {
    changeLanguage(value);
  };

  return (
    <Select
      value={language}
      onChange={handleLanguageChange}
      style={{ minWidth: 120 }}
      suffixIcon={<GlobalOutlined />}
      size="small"
      bordered={false}
    >
      {languages.map((lang) => (
        <Option key={lang.code} value={lang.code}>
          <Space>
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </Space>
        </Option>
      ))}
    </Select>
  );
};

export default LanguageSwitcher;