import { Typography } from 'antd';
import { useParams } from 'react-router-dom';

const { Title } = Typography;

const ListDetail = () => {
  const { id } = useParams();
  
  return (
    <div>
      <Title level={2}>Liste Details</Title>
      <p>Liste ID: {id}</p>
      <p>Liste Details Seite - wird später implementiert</p>
    </div>
  );
};

export default ListDetail;