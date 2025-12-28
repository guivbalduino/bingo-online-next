"use client";

import { useState, useEffect } from 'react';
import { WinningPattern, SubPattern, loadWinningPatterns, saveWinningPatterns, defaultWinningPatterns } from '@/lib/winning-patterns';

export default function SettingsPage() {
    const [patterns, setPatterns] = useState<WinningPattern[]>([]);
    const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        setPatterns(loadWinningPatterns());
    }, []);

    const handlePatternChange = (patternId: string, enabled: boolean) => {
        const newPatterns = patterns.map(p =>
            p.id === patternId ? { ...p, enabled } : p
        );
        setPatterns(newPatterns);
    };

    const handleSubPatternChange = (patternId: string, subPatternId: string, enabled: boolean) => {
        const newPatterns = patterns.map(p => {
            if (p.id === patternId) {
                const newSubPatterns = p.subPatterns?.map(sp =>
                    sp.id === subPatternId ? { ...sp, enabled } : sp
                );
                return { ...p, subPatterns: newSubPatterns };
            }
            return p;
        });
        setPatterns(newPatterns);
    };
    
    const handleSaveChanges = () => {
        saveWinningPatterns(patterns);
        setNotificationMessage('Configurações salvas com sucesso!');
        setTimeout(() => setNotificationMessage(null), 2000);
    };

    const handleResetToDefaults = () => {
        if (confirm('Tem certeza que deseja resetar para as configurações padrão?')) {
            setPatterns(defaultWinningPatterns);
            saveWinningPatterns(defaultWinningPatterns);
            setNotificationMessage('Configurações restauradas para o padrão.');
            setTimeout(() => setNotificationMessage(null), 2000);
        }
    };

    if (!isClient) {
        return null; // Render nothing on the server
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-white font-sans p-8">
            <header className="mb-8">
                <h1 className="text-4xl font-bold text-center">Configurações do Jogo</h1>
                <p className="text-center text-gray-400">Habilite e configure os padrões de vitória para o bingo.</p>
            </header>

            <main className="flex-1 flex flex-col items-center gap-8">
                <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-semibold mb-6 text-center">Padrões de Vitória</h2>
                    
                    <div className="space-y-6">
                        {patterns.map(pattern => (
                            <div key={pattern.id} className="bg-gray-700 p-4 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold">{pattern.name}</h3>
                                        <p className="text-sm text-gray-400">{pattern.description}</p>
                                    </div>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox h-6 w-6 text-blue-600 rounded"
                                            checked={pattern.enabled}
                                            onChange={(e) => handlePatternChange(pattern.id, e.target.checked)}
                                        />
                                    </label>
                                </div>

                                {pattern.subPatterns && pattern.enabled && (
                                    <div className="mt-4 pl-6 border-l-2 border-gray-600 space-y-3">
                                        <h4 className="font-semibold">Tipos de {pattern.name}:</h4>
                                        {pattern.subPatterns.map(subPattern => (
                                            <div key={subPattern.id} className="flex items-center justify-between">
                                                <span className="text-gray-300">{subPattern.name}</span>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="form-checkbox h-5 w-5 text-blue-500 rounded"
                                                        checked={subPattern.enabled}
                                                        onChange={(e) => handleSubPatternChange(pattern.id, subPattern.id, e.target.checked)}
                                                    />
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center gap-4 mt-8">
                        <button
                            onClick={handleSaveChanges}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
                        >
                            Salvar Alterações
                        </button>
                         <button
                            onClick={handleResetToDefaults}
                            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
                        >
                            Resetar
                        </button>
                    </div>
                    {notificationMessage && (
                        <div className="mt-4 text-center text-green-400 text-lg transition-opacity duration-500 opacity-100">
                            {notificationMessage}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
