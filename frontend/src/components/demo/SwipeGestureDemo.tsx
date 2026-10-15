import React, { useState } from 'react';
import { Card, Typography, Space, Tag, Switch, Button } from 'antd';
import { SwipeableViewContainer } from '../navigation';
import { MomentumScrollContainer } from '../common';
import { useSwipeGestures, useSwipeToDelete } from '../../hooks/useSwipeGestures';

const { Title, Paragraph } = Typography;

export const SwipeGestureDemo: React.FC = () => {
  const [enableSwipe, setEnableSwipe] = useState(true);
  const [demoCards, setDemoCards] = useState([
    { id: '1', title: 'Swipe mich nach links zum Löschen!', content: 'Demo Card 1' },
    { id: '2', title: 'Ich bin auch swipeable!', content: 'Demo Card 2' },
    { id: '3', title: 'Probiere es aus!', content: 'Demo Card 3' },
  ]);
  const [currentView, setCurrentView] = useState(0);

  const views = ['Karten View', 'Liste View', 'Grid View'];

  const navigationHandlers = useSwipeGestures({
    onSwipeLeft: () => {
      setCurrentView(prev => (prev + 1) % views.length);
    },
    onSwipeRight: () => {
      setCurrentView(prev => (prev - 1 + views.length) % views.length);
    },
    threshold: 80,
  });

  const removeCard = (id: string) => {
    setDemoCards(prev => prev.filter(card => card.id !== id));
  };

  const resetCards = () => {
    setDemoCards([
      { id: '1', title: 'Swipe mich nach links zum Löschen!', content: 'Demo Card 1' },
      { id: '2', title: 'Ich bin auch swipeable!', content: 'Demo Card 2' },
      { id: '3', title: 'Probiere es aus!', content: 'Demo Card 3' },
    ]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Title level={2}>🎯 Swipe Gesture System Demo</Title>
      
      <div className="mb-6">
        <Space direction="vertical" size="large" className="w-full">
          <Card title="⚙️ Einstellungen">
            <Space>
              <Switch 
                checked={enableSwipe} 
                onChange={setEnableSwipe}
                checkedChildren="Swipe AN"
                unCheckedChildren="Swipe AUS"
              />
              <Button onClick={resetCards}>Karten zurücksetzen</Button>
            </Space>
          </Card>

          <Card title="📱 Navigation Demo">
            <SwipeableViewContainer
              onSwipeLeft={() => setCurrentView(prev => (prev + 1) % views.length)}
              onSwipeRight={() => setCurrentView(prev => (prev - 1 + views.length) % views.length)}
              disabled={!enableSwipe}
            >
              <div className="text-center p-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <Title level={3}>📋 {views[currentView]}</Title>
                <Paragraph>
                  Swipe nach links oder rechts um zwischen Views zu wechseln!
                </Paragraph>
                <div className="flex justify-center gap-2 mt-4">
                  {views.map((_, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentView ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </SwipeableViewContainer>
          </Card>

          <Card title="🗑️ Swipe-to-Delete Demo">
            <div className="space-y-3">
              {demoCards.map((card) => (
                <SwipeableCard
                  key={card.id}
                  card={card}
                  onDelete={() => removeCard(card.id)}
                  enableSwipe={enableSwipe}
                />
              ))}
              {demoCards.length === 0 && (
                <div className="text-center p-8 text-gray-500">
                  <Paragraph>Alle Karten wurden gelöscht! 🎉</Paragraph>
                  <Button onClick={resetCards}>Karten zurücksetzen</Button>
                </div>
              )}
            </div>
          </Card>

          <Card title="📜 Pull-to-Refresh Demo">
            <MomentumScrollContainer
              onRefresh={() => {
                console.log('🔄 Refreshing...');
                // Simulate refresh
                setTimeout(() => {
                  console.log('✅ Refresh complete!');
                }, 1000);
              }}
              enableRefresh={enableSwipe}
              className="h-64"
            >
              <div className="space-y-4 p-4">
                {Array.from({ length: 20 }, (_, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg">
                    <Paragraph className="mb-0">
                      Scroll-Element {i + 1} - Ziehe nach unten zum Aktualisieren!
                    </Paragraph>
                  </div>
                ))}
              </div>
            </MomentumScrollContainer>
          </Card>
        </Space>
      </div>
    </div>
  );
};

// Demo Card Component mit Swipe-to-Delete
const SwipeableCard: React.FC<{
  card: { id: string; title: string; content: string };
  onDelete: () => void;
  enableSwipe: boolean;
}> = ({ card, onDelete, enableSwipe }) => {
  const {
    swipeHandlers,
    swipeOffset,
    isDeleting,
    deleteProgress,
    resetSwipe,
  } = useSwipeToDelete({
    onDelete,
    onCancel: () => {}, // Will be handled by resetSwipe function
    threshold: 50,
    deleteThreshold: 120,
    direction: 'left',
  });

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Delete Background */}
      {enableSwipe && swipeOffset > 0 && (
        <div 
          className={`absolute inset-0 flex items-center justify-end pr-4 transition-colors duration-200 ${
            isDeleting 
              ? 'bg-red-500 text-white' 
              : 'bg-red-100 text-red-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {isDeleting ? '🗑️ Loslassen zum Löschen' : '👈 Weiter swipen'}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white bg-opacity-30">
            <div 
              className="h-full bg-white transition-all duration-100"
              style={{ width: `${deleteProgress * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Card Content */}
      <Card
        {...(enableSwipe ? swipeHandlers : {})}
        className="relative z-10 cursor-pointer hover:shadow-md transition-shadow"
        style={{
          transform: enableSwipe ? `translateX(-${swipeOffset}px)` : undefined,
          transition: swipeOffset === 0 ? 'transform 0.3s ease-out' : 'none',
        }}
      >
        <Space direction="vertical" className="w-full">
          <div className="flex justify-between items-start">
            <Title level={5} className="mb-0">{card.title}</Title>
            {enableSwipe && (
              <Tag color="blue" className="text-xs">👈 Swipe</Tag>
            )}
          </div>
          <Paragraph className="mb-0 text-gray-600">
            {card.content}
          </Paragraph>
        </Space>
      </Card>
    </div>
  );
};