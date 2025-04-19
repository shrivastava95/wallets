import React, { useState, useEffect } from 'react';
import {
    PriceChartWidget
} from './components/PriceChartWidget';
import './App.css';

function App() {
    const [tokenAddresses, setTokenAddresses] = useState([]);
    const [tokenPairMapping, setTokenPairMapping] = useState({}); // State for pair mapping
    const [tokenOhlcvData, setTokenOhlcvData] = useState({}); // State for OHLCV/Buyer data
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [scriptError, setScriptError] = useState(null);
    const [selectedTokenIndex, setSelectedTokenIndex] = useState(0);
    const [selectedDexId, setSelectedDexId] = useState(null); // State for selected DEX (e.g., 'pumpfun', 'raydium')
    const [selectedChartType, setSelectedChartType] = useState('moralis'); // Default to 'moralis'

    useEffect(() => {
        // Fetch both files
        Promise.all([
            fetch('target_tokens.json'),
            fetch('token_pair_mapping.json'),
            fetch('ohlcv_batch_80_87_sol_switch.json')
        ])
        .then(async ([tokensResponse, mappingResponse, ohlcvResponse]) => {
            if (!tokensResponse.ok) {
                throw new Error(`Token list fetch failed: ${tokensResponse.status}`);
            }
            if (!mappingResponse.ok) {
                throw new Error(`Pair mapping fetch failed: ${mappingResponse.status}`);
            }
            if (!ohlcvResponse.ok) {
                // Don't throw, maybe just log an error and continue without this data?
                console.error(`OHLCV data fetch failed: ${ohlcvResponse.status}`);
                // Or set a specific error state?
                // For now, we'll allow the app to load without it.
            }
            const tokensData = await tokensResponse.json();
            const mappingData = await mappingResponse.json();
            const ohlcvData = ohlcvResponse.ok ? await ohlcvResponse.json() : {}; // Default to empty object on failure

            if (!Array.isArray(tokensData)) {
                throw new Error("Token list data is not an array");
            }
            if (typeof mappingData !== 'object' || mappingData === null) {
                 throw new Error("Pair mapping data is not an object");
            }

            setTokenAddresses(tokensData);
            setTokenPairMapping(mappingData);
            setTokenOhlcvData(ohlcvData); // Store the fetched OHLCV data
            setLoading(false);

            // Set initial DEX preference after data loads
            if (tokensData.length > 0) {
                const initialToken = tokensData[0];
                const initialPairs = mappingData[initialToken] || {};
                if (initialPairs.pumpfun) {
                    setSelectedDexId('pumpfun');
                } else if (initialPairs.raydium) {
                    setSelectedDexId('raydium');
                } else if (initialPairs.pumpswap) {
                    setSelectedDexId('pumpswap');
                } else {
                    setSelectedDexId(null); // No pair found for initial token
                }
            }
        })
        .catch(fetchError => {
            console.error("Error fetching data:", fetchError);
            setError(`Failed to load data: ${fetchError.message}`);
            setLoading(false);
        });
    }, []); // Empty dependency array means this runs once on mount

    // Effect to load the Moralis widget script once
    useEffect(() => {
        // Only load if Moralis chart type might be selected
        // Or maybe load regardless? Let's load it always for simplicity for now.
        const scriptId = 'moralis-chart-widget';
        if (document.getElementById(scriptId)) {
            // Script already exists, ensure state is set if window function is present
            if(window.createMyWidget && !scriptLoaded) setScriptLoaded(true);
            return;
        }
        if (scriptError) return; // Don't try loading if it previously failed

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://moralis.com/static/embed/chart.js';
        script.type = 'text/javascript';
        script.async = true;
        script.onload = () => {
            console.log("Moralis chart script loaded successfully.");
            setScriptLoaded(true);
        };
        script.onerror = () => {
            const errorMsg = 'Failed to load the Moralis chart widget script.';
            console.error(errorMsg);
            setScriptError(errorMsg);
        };
        document.body.appendChild(script);

        // Cleanup script tag if App component unmounts (optional but good practice)
        return () => {
            const existingScript = document.getElementById(scriptId);
            if (existingScript) {
                // Cautious cleanup: check if parent exists before removing
                if (existingScript.parentNode) {
                     existingScript.parentNode.removeChild(existingScript);
                }
            }
        };
    }, [scriptLoaded, scriptError]); // Dependencies for Moralis script loading

    // --- Navigation Handlers ---
    const handleNext = () => {
        const nextIndex = (selectedTokenIndex + 1) % tokenAddresses.length;
        setSelectedTokenIndex(nextIndex);
        // Reset DEX preference when changing token
        resetSelectedDex(nextIndex);
    };

    const handlePrev = () => {
        const prevIndex = (selectedTokenIndex - 1 + tokenAddresses.length) % tokenAddresses.length;
        setSelectedTokenIndex(prevIndex);
        // Reset DEX preference when changing token
        resetSelectedDex(prevIndex);
    };

    const resetSelectedDex = (tokenIndex) => {
        const tokenAddr = tokenAddresses[tokenIndex];
        const availablePairs = tokenPairMapping[tokenAddr] || {};
        if (availablePairs.raydium) {
            setSelectedDexId('raydium');
        } else if (availablePairs.pumpswap) {
            setSelectedDexId('pumpswap');
        } else if (availablePairs.pumpfun) {
            setSelectedDexId('pumpfun');
        } else {
            setSelectedDexId(null);
        }
    };

    const handleChartTypeSelect = (chartType) => {
        setSelectedChartType(chartType);
    };

    const handleDexSelect = (dexId) => {
        setSelectedDexId(dexId);
    };

    // Get the currently selected token address and its available pairs
    const selectedTokenAddr = tokenAddresses[selectedTokenIndex];
    const availablePairs = tokenPairMapping[selectedTokenAddr] || {};
    const currentOhlcvData = tokenOhlcvData[selectedTokenAddr] || {}; // Get data for current token
    const selectedPairAddr = selectedDexId ? availablePairs[selectedDexId] : null;
    const dexScreenerEmbedUrl = selectedPairAddr ? `https://dexscreener.com/solana/${selectedPairAddr}?embed=1&theme=dark&info=0` : null;

    // --- Debug Logging --- 
    console.log("Selected Token:", selectedTokenAddr);
    console.log("Available Pairs:", availablePairs);
    console.log("OHLCV/Buyer Data:", currentOhlcvData); // Log the new data
    console.log("Selected DEX ID:", selectedDexId);

    // --- Render Logic ---
    return (
        <div className="App">
            <h1>Solana Token Charts (Dexscreener)</h1>

            {loading && <p>Loading token data...</p>}
            {error && <p style={{ color: 'red' }}>Data Loading Error: {error}</p>}
            {/* Display Moralis script error if it occurred */}
            {scriptError && <p style={{ color: 'orange' }}>Chart Script Error: {scriptError}</p>}

            {!loading && !error && tokenAddresses.length > 0 && (
                <>
                    {/* Token Navigation */}
                    <div className="navigation token-navigation">
                        <button onClick={handlePrev} disabled={tokenAddresses.length <= 1}>
                            &lt; Previous Token
                        </button>
                        <span>
                            Token {selectedTokenIndex + 1} of {tokenAddresses.length}
                            <span className="token-address">({selectedTokenAddr ? selectedTokenAddr : 'N/A'})</span>
                        </span>
                        <button onClick={handleNext} disabled={tokenAddresses.length <= 1}>
                            Next Token &gt;
                        </button>
                    </div>

                    {/* Top Info: Axiom Link & ATH Stats */}
                    <div className="top-info-container">
                        {currentOhlcvData.axiomLink && (
                            <div className="axiom-link-item"> {/* Wrap link */}
                            <a href={currentOhlcvData.axiomLink} target="_blank" rel="noopener noreferrer">
                                Open on Axiom
                            </a>
                            </div>
                        )}
                        {/* Display ATH Info Here */}
                        <p className="ath-info-item"> {/* Wrap ATH */}
                            <strong>ATH (USD):</strong> {currentOhlcvData.calculatedAthUsd ?? 'N/A'}
                        </p>
                        <p className="ath-info-item"> {/* Wrap Est MCAP */}
                            <strong>Est. ATH MCAP (USD):</strong> {currentOhlcvData.estimatedAthMarketCapUsd ?? 'N/A'}
                        </p>
                    </div>

                    {/* Chart Type Selection */}
                    <div className="chart-type-navigation">
                        <span>Chart Type:</span>
                        <button
                            onClick={() => handleChartTypeSelect('dexscreener')}
                            className={selectedChartType === 'dexscreener' ? 'active' : ''}
                        >
                            Dexscreener
                        </button>
                        <button
                            onClick={() => handleChartTypeSelect('moralis')}
                            className={selectedChartType === 'moralis' ? 'active' : ''}
                            disabled={!scriptLoaded} // Disable if Moralis script hasn't loaded
                        >
                            Moralis {scriptLoaded ? '' : "(Loading...)"}
                        </button>
                        {/* Show Moralis script error inline if relevant */}
                        {selectedChartType === 'moralis' && scriptError &&
                            <span style={{color: 'orange', marginLeft: '1em'}}>(Moralis Script Failed to Load)</span>
                        }
                    </div>

                    {/* DEX Selection Navigation (Always visible if pairs exist) */}
                    <div className="dex-navigation">
                        <span>Chart Source:</span>
                        {availablePairs.pumpfun && (
                            <button
                                onClick={() => handleDexSelect('pumpfun')}
                                className={selectedDexId === 'pumpfun' ? 'active' : ''}
                            >
                                Pump.fun
                            </button>
                        )}
                        {availablePairs.raydium && (
                            <button
                                onClick={() => handleDexSelect('raydium')}
                                className={selectedDexId === 'raydium' ? 'active' : ''}
                            >
                                Raydium
                            </button>
                        )}
                        {availablePairs.pumpswap && (
                            <button
                                onClick={() => handleDexSelect('pumpswap')}
                                className={selectedDexId === 'pumpswap' ? 'active' : ''}
                            >
                                Pumpswap
                            </button>
                        )}
                        {/* Show message if no pairs found for this token */}
                        {!availablePairs.pumpfun && !availablePairs.raydium && !availablePairs.pumpswap && (
                            <span>No Pump.fun/Raydium/Pumpswap pair found</span>
                        )}
                    </div>

                    {/* Chart Display Area */}
                    <div className="chart-container-single dexscreener-embed">
                        {/* --- Dexscreener Chart --- */}
                        {selectedChartType === 'dexscreener' && dexScreenerEmbedUrl && (
                            <iframe
                                title={`Dexscreener Chart - ${selectedPairAddr}`}
                                src={dexScreenerEmbedUrl}
                                width="100%"
                                height="100%"
                                style={{ border: 'none' }}
                                allowFullScreen
                            />
                        )}
                        {/* --- Moralis Chart --- */}
                        {selectedChartType === 'moralis' && scriptLoaded && selectedTokenAddr && (
                            <PriceChartWidget
                                pairAddress={selectedPairAddr}
                                containerId={`moralis-chart-${selectedTokenIndex}`}
                                scriptLoaded={scriptLoaded}
                            />
                        )}
                        {/* --- Placeholder/Info Text --- */}
                        {selectedChartType === 'dexscreener' && !selectedPairAddr && (
                            <p>Select a chart source above (Pump.fun, Raydium, or Pumpswap).</p>
                        )}
                        {selectedChartType === 'moralis' && !selectedPairAddr && scriptLoaded && (
                            <p>Select a chart source above (Pump.fun, Raydium, or Pumpswap).</p>
                        )}
                        {selectedChartType === 'moralis' && !scriptLoaded && !scriptError && (
                            <p>Loading Moralis chart library...</p>
                        )}
                        {selectedChartType === 'moralis' && scriptError && (
                            <>
                                <p style={{color: 'orange'}}>Could not load Moralis chart library.</p>
                                <p>Select a chart source above (Pump.fun, Raydium, or Pumpswap).</p>
                            </>
                        )}
                    </div>

                    {/* --- Additional Token Info --- */}
                    <div className="token-extra-data">
                        <h3>Additional Info</h3>
                        <div>
                            <strong>First {currentOhlcvData.first50Buyers?.length ?? 0} Buyers:</strong>
                            {currentOhlcvData.first50Buyers && currentOhlcvData.first50Buyers.length > 0 ? (
                                <ul className="buyer-list">
                                    {currentOhlcvData.first50Buyers.map((buyer) => (
                                        <li key={`${buyer.rank}-${buyer.wallet}`}>
                                            {buyer.rank}. <span className="wallet-address">{buyer.wallet}</span> ({buyer.sol_spent} SOL)
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No buyer data available.</p>
                            )}
                        </div>
                    </div>
                </>
            )}

            {!loading && !error && tokenAddresses.length === 0 && (
                 <p>No token addresses found in the list.</p>
            )}
        </div>
    );
}

export default App;
