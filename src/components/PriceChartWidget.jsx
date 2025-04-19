import React, { useEffect, useRef } from 'react';

// Updated component using pairAddress based on user-provided snippet
// Accepts pairAddress, containerId, scriptLoaded as props
export const PriceChartWidget = ({ pairAddress, containerId, scriptLoaded }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    // Ensure window is defined
    if (typeof window === 'undefined') return;

    // Wait for the parent to confirm the script is loaded
    if (!scriptLoaded) return;

    let widgetInstance = null;

    const loadWidget = () => {
      // Check if pairAddress is provided, otherwise don't load
      if (!pairAddress) {
          console.log("PriceChartWidget: No pairAddress provided, skipping load.");
          // Optional: Clear the container if no pair address
          const container = document.getElementById(containerId);
          if (container) container.innerHTML = '<p style="padding: 1em; text-align: center;">Select a DEX source first.</p>';
          return;
      }
        
      if (typeof window.createMyWidget === 'function') {
        console.log(`PriceChartWidget: Loading Moralis widget for pair ${pairAddress} into container ${containerId}`);
        widgetInstance = window.createMyWidget(containerId, { // Use dynamic containerId
          autoSize: true,
          chainId: 'solana', // Set chainId to Solana
          pairAddress: pairAddress, // Use the pairAddress prop
          // tokenAddress: tokenAddress, // Remove tokenAddress if pairAddress is used
          showHoldersChart: true,
          defaultInterval: '30', // Keep previous setting
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Etc/UTC',
          theme: 'moralis',
          locale: 'en',
          backgroundColor: '#071321',
          gridColor: '#0d2035',
          textColor: '#68738D',
          candleUpColor: '#4CE666',
          candleDownColor: '#E64C4C',
          hideLeftToolbar: false,
          hideTopToolbar: false,
          hideBottomToolbar: false
        });
      } else {
        console.error('createMyWidget function is not defined.');
      }
    };

    // Function to cleanup widget if component unmounts or props change
    const cleanupWidget = () => {
        const container = document.getElementById(containerId);
        if (container) {
           container.innerHTML = ''; // Clear previous content/widget
           // console.log(`Cleaned up widget for ${containerId}`);
        }
        // Add specific destroy call if the widget API supports it
        // if (widgetInstance && typeof widgetInstance.destroy === 'function') {
        //     widgetInstance.destroy();
        // }
    };

    // Cleanup before loading new widget
    cleanupWidget(); 
    loadWidget();

    // Cleanup on unmount
    return () => {
      cleanupWidget();
    };
    // Rerun effect if pairAddress, containerId, or scriptLoaded changes
  }, [pairAddress, containerId, scriptLoaded]); 

  return (
    <div style={{ width: "100%", height: "100%" }}> 
      <div
        id={containerId} // Use dynamic ID from props
        ref={containerRef}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}; 