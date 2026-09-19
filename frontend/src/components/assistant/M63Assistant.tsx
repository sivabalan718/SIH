import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { M63AssistantButton } from './M63AssistantButton.js';
import { M63AssistantPanel } from './M63AssistantPanel.js';
import { queryAssistant, AssistantLanguage } from '../../services/assistantService.js';

export const M63Assistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Determine current page context
  const getPageContext = () => {
    const path = location.pathname;
    if (path.includes('/products/new')) return 'new-product';
    if (path.includes('/products/')) return 'product-detail';
    if (path.includes('/products')) return 'products';
    if (path.includes('/orders')) return 'orders';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/pricing')) return 'pricing';
    return 'dashboard';
  };

  const handleQuery = async (query: { text?: string; audioBlob?: Blob; browserTranscript?: string; language: AssistantLanguage }) => {
    return queryAssistant({
      ...query,
      pageContext: getPageContext(),
    });
  };

  return (
    <>
      <M63AssistantButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />
      {isOpen && (
        <M63AssistantPanel
          onClose={() => setIsOpen(false)}
          onQuery={handleQuery}
          pageContext={getPageContext()}
        />
      )}
    </>
  );
};
