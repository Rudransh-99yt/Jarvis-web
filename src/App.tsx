import React, { useState, useEffect } from 'react';
import { AppShell } from './components/layout/AppShell.tsx';
import { CommandDeckSector } from './sectors/command/CommandDeckSector.tsx';
import { EducationSector } from './sectors/education/EducationSector.tsx';
import { ResearchSector } from './sectors/research/ResearchSector.tsx';
import { soundEffects } from './services/soundEffects.ts';
import { speechService } from './services/speechService.ts';
import { processJarvisCommand } from './services/commandProcessor.ts';
import type {
  HudTheme,
  StarkProtocol,
  ArmorMark,
  StarkDirective,
  TerminalLog
} from './types.ts';
import type { SectorId, EducationRole } from './types/api.ts';

const INITIAL_PROTOCOLS: StarkProtocol[] = [
  {
    id: 'house_party',
    code: 'PROTOCOL-07',
    name: 'House Party',
    description: 'Deploys all automated autonomous Iron Man armor suits from subterranean storage.',
    category: 'Assault',
    active: false,
    soundCue: 'affirmative'
  },
  {
    id: 'defense_matrix',
    code: 'DEF-900',
    name: 'Defense Matrix',
    description: 'Elevates electromagnetic shield harmonics to maximum resilience across perimeter.',
    category: 'Defense',
    active: false,
    soundCue: 'scan'
  },
  {
    id: 'stealth_mode',
    code: 'STL-44',
    name: 'Stealth Camouflage',
    description: 'Dampens acoustic signatures and shifts optical refraction to active camouflage.',
    category: 'Defense',
    active: false,
    soundCue: 'scan'
  },
  {
    id: 'clean_slate',
    code: 'OMEGA-00',
    name: 'Clean Slate',
    description: 'Emergency security protocol to purge localized data caches and seal vaults.',
    category: 'Emergency',
    active: false,
    soundCue: 'warning'
  }
];

const INITIAL_ARMORS: ArmorMark[] = [
  {
    id: 'mark3',
    designation: 'MARK III',
    name: 'Classic Gold-Titanium',
    class: 'Heavy Combat Multi-Role',
    powerOutput: '1.8 GW Palladium',
    status: 'Standby',
    integrity: 94,
    description: 'The iconic Red and Gold suit engineered from high-durability Gold-Titanium alloy with twin palm repulsors and uni-beam.',
    features: ['Anti-Icing Heaters', 'Flares Countermeasure', 'Supersonic Flight']
  },
  {
    id: 'mark7',
    designation: 'MARK VII',
    name: 'Rapid Deployment Pod',
    class: 'Avenger Vanguard',
    powerOutput: '2.4 GW Arc',
    status: 'Standby',
    integrity: 96,
    description: 'Equipped with laser-guided airborne homing pods for zero-gantry mid-air donning during hostile incursions.',
    features: ['Rotary Micro-Missiles', 'Triple Laser Pods', 'Heavy Thruster Array']
  },
  {
    id: 'mark42',
    designation: 'MARK XLII',
    name: 'Autonomous Prehensile',
    class: 'Modular Telepresence',
    powerOutput: '2.9 GW Arc',
    status: 'Standby',
    integrity: 88,
    description: 'Subcutaneous micro-transponder tracking enables each individual armor piece to fly independently to the pilot.',
    features: ['Prehensile Propulsion', 'Neural Telepresence', 'Sub-Orbital Recovery']
  },
  {
    id: 'mark44',
    designation: 'MARK XLIV',
    name: 'Hulkbuster',
    class: 'Super-Heavy Titan Exo',
    powerOutput: '7.5 GW Dual-Core',
    status: 'Standby',
    integrity: 100,
    description: 'Veronica satellite-deployed orbital fortress chassis designed specifically for extreme kinetic containment.',
    features: ['Hydraulic Pneumatics', 'In-Flight Replacement Limbs', 'Impact Dampeners']
  },
  {
    id: 'mark50',
    designation: 'MARK L',
    name: 'Bleeding Edge Nanotech',
    class: 'Liquid Nanomaterial',
    powerOutput: '4.2 GW Nano-Arc',
    status: 'Standby',
    integrity: 98,
    description: 'Stores millions of nanoparticles inside the chest housing, instantaneously manifesting blasters, shields, and wings.',
    features: ['Nanotech Manifestation', 'Zero-G Thruster Wings', 'Energy Shields']
  },
  {
    id: 'mark85',
    designation: 'MARK LXXXV',
    name: 'Cosmic Nanotech Pinnacle',
    class: 'Supreme Vanguard',
    powerOutput: '5.6 GW Vibranium-Arc',
    status: 'Active',
    integrity: 100,
    description: 'The definitive Iron Man armor, fusing Vibranium lattice with advanced nanotechnology capable of channeling cosmic energy.',
    features: ['Lightning Refocuser', 'Cosmic Energy Matrix', 'Vibranium Nano-Shield']
  }
];

const INITIAL_DIRECTIVES: StarkDirective[] = [
  {
    id: '1',
    title: 'Recalibrate Mark 85 lightning refocuser nanoburst array',
    category: 'Research',
    timestamp: '10:14 AM',
    completed: false,
    priority: 'high'
  },
  {
    id: '2',
    title: 'Verify Veronica satellite orbital synchronization over sector 4',
    category: 'Security',
    timestamp: '09:42 AM',
    completed: true,
    priority: 'medium'
  },
  {
    id: '3',
    title: 'Review clean energy output metrics for Stark Tower Manhattan grid',
    category: 'Research',
    timestamp: '08:30 AM',
    completed: false,
    priority: 'low'
  }
];

export function App() {
  // Sector Navigation State - Default to Education OS
  const [currentSector, setCurrentSector] = useState<SectorId>(() => {
    try {
      const saved = localStorage.getItem('jarvis_active_sector');
      if (saved === 'command' || saved === 'education' || saved === 'research') {
        return saved as SectorId;
      }
    } catch {}
    return 'education';
  });
  const [educationRole, setEducationRole] = useState<EducationRole>('student');
  const [isMuted, setIsMuted] = useState(false);
  const [apiProviderName, setApiProviderName] = useState('Google Gemini (gemini-3.8-flash)');
  const [isApiOnline, setIsApiOnline] = useState(true);

  // Command Deck State
  const [protocols, setProtocols] = useState<StarkProtocol[]>(INITIAL_PROTOCOLS);
  const [armors, setArmors] = useState<ArmorMark[]>(INITIAL_ARMORS);
  const [activeSuit, setActiveSuit] = useState<ArmorMark>(INITIAL_ARMORS[5]);
  const [directives, setDirectives] = useState<StarkDirective[]>(INITIAL_DIRECTIVES);

  // Telemetry Metrics
  const [corePower, setCorePower] = useState(3.2);
  const [temperature, setTemperature] = useState(412);
  const [plasmaStability, setPlasmaStability] = useState(99.4);
  const [efficiency, setEfficiency] = useState(98.7);
  const [isOverclocked, setIsOverclocked] = useState(false);

  // Interaction State
  const [isScanning, setIsScanning] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [sessionId] = useState<string>(() => `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);

  const [logs, setLogs] = useState<TerminalLog[]>([
    {
      id: 'log-0',
      timestamp: '08:00:00',
      type: 'system',
      message: 'J.A.R.V.I.S. neural interface initialized. Diagnostic handshake confirmed.'
    },
    {
      id: 'log-1',
      timestamp: '08:00:01',
      type: 'jarvis',
      message: 'At your service, sir. All telemetry monitors and multi-sector bridges are online and nominal.'
    }
  ]);

  // Voice speech state synchronization & initial handshake
  useEffect(() => {
    const unsubSpeaking = speechService.subscribeSpeaking((speaking) => {
      setIsSpeaking(speaking);
    });
    const unsubListening = speechService.subscribeListening((listening) => {
      setIsListening(listening);
    });

    soundEffects.playStartup();

    // Verify Node.js backend API health and active provider
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data?.status === 'healthy') {
          setIsApiOnline(data.provider?.available !== false);
          if (data.provider?.name) setApiProviderName(data.provider.name);
          const providerLabel = data.provider?.name
            ? `${data.provider.name} (${data.provider.available ? 'ONLINE' : 'STANDBY'})`
            : 'Operational';
          const persistenceLabel = data.persistence?.persistent ? 'LOCAL DISK (DURABLE)' : 'MEMORY';
          addLog('system', `API Gateway online: ${data.service} v${data.version} // Storage: ${persistenceLabel} // Sectors: ${data.sectors?.active?.join(', ') || 'command, education'} // Provider: ${providerLabel}`);
        }
      })
      .catch(() => {
        setIsApiOnline(false);
      });

    // Synchronize initial protocol states from server single-source-of-truth
    fetch('/api/protocols')
      .then((res) => res.json())
      .then((data) => {
        if (data?.protocols && Array.isArray(data.protocols)) {
          setProtocols(data.protocols);
        }
      })
      .catch(() => {});

    return () => {
      unsubSpeaking();
      unsubListening();
    };
  }, []);

  const addLog = (type: TerminalLog['type'], message: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: timeStr,
        type,
        message
      }
    ]);
  };

  // Reusable Chat API caller
  const sendChatMessage = async (message: string, context?: any): Promise<string> => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        sessionId,
        stream: false,
        context: {
          sector: currentSector,
          role: educationRole,
          ...context
        }
      })
    });
    if (!res.ok) throw new Error(`Chat API failed with status ${res.status}`);
    const data = await res.json();
    return data.reply || 'Directive processed.';
  };

  // Command Deck execution loop
  const executeCommand = async (cmdText: string) => {
    if (isTransmitting) return;

    addLog('user', cmdText);

    // Evaluate local HUD actions
    const localResult = processJarvisCommand(cmdText, {
      protocols,
      armors,
      directives
    });

    if (localResult.action === 'CLEAR_LOGS') {
      setLogs([]);
      return;
    } else if (localResult.action === 'SCAN') {
      runFullScan();
    } else if (localResult.action === 'PROTOCOL_TOGGLE' && localResult.payload) {
      toggleProtocol(localResult.payload);
    } else if (localResult.action === 'ADD_DIRECTIVE' && localResult.payload) {
      addDirective(localResult.payload);
    } else if (localResult.action === 'ALARM') {
      soundEffects.playWarning();
    }

    // Set up placeholder for assistant streaming response
    const assistantLogId = `log-assistant-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setLogs((prev) => [
      ...prev,
      {
        id: assistantLogId,
        timestamp: timeStr,
        type: 'jarvis',
        message: '...'
      }
    ]);

    setIsTransmitting(true);

    try {
      const activeProto = protocols.find((p) => p.active)?.name;
      const deployedSuits = armors.filter((a) => a.status === 'Deployed' || a.status === 'Active').map((a) => a.designation);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          message: cmdText,
          sessionId,
          stream: true,
          context: {
            sector: currentSector,
            activeProtocol: activeProto,
            deployedArmors: deployedSuits
          }
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedReply = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          try {
            const eventData = JSON.parse(trimmed.replace(/^data:\s*/, ''));

            if (eventData.type === 'tool_start') {
              const toolName = eventData.tool?.name || 'tactical_tool';
              soundEffects.playScan();
              addLog('system', `SYSTEM CHECK: Executing [${toolName}]...`);
            } else if (eventData.type === 'tool_result') {
              const toolName = eventData.tool?.name || eventData.result?.name || 'tactical_tool';
              const isOk = eventData.result?.ok !== false;
              soundEffects.playAffirmative();
              addLog(isOk ? 'system' : 'alert', `SYSTEM CHECK COMPLETE: [${toolName}] (status: ${isOk ? 'OK' : 'FAILED'})`);
              if (eventData.protocols && Array.isArray(eventData.protocols)) {
                setProtocols(eventData.protocols);
              }
            } else if (eventData.type === 'chunk' && eventData.chunk) {
              accumulatedReply += eventData.chunk;
              setLogs((prev) =>
                prev.map((l) => (l.id === assistantLogId ? { ...l, message: accumulatedReply } : l))
              );
            } else if (eventData.type === 'done') {
              if (eventData.protocols && Array.isArray(eventData.protocols)) {
                setProtocols(eventData.protocols);
              }
              const finalMessage = eventData.fullReply || accumulatedReply || localResult.reply;
              setLogs((prev) =>
                prev.map((l) => (l.id === assistantLogId ? { ...l, message: finalMessage } : l))
              );
              if (!isMuted) {
                speechService.speak(eventData.speechText || finalMessage);
              }
              soundEffects.playAffirmative();
            } else if (eventData.type === 'error') {
              const fallback = localResult.reply;
              setLogs((prev) =>
                prev.map((l) => (l.id === assistantLogId ? { ...l, message: fallback } : l))
              );
              if (!isMuted) speechService.speak(fallback);
            }
          } catch {
            // continue decoding
          }
        }
      }
    } catch (err) {
      const fallbackMsg = localResult.reply;
      setLogs((prev) =>
        prev.map((l) => (l.id === assistantLogId ? { ...l, message: fallbackMsg } : l))
      );
      if (!isMuted) speechService.speak(fallbackMsg);
    } finally {
      setIsTransmitting(false);
    }
  };

  const runFullScan = () => {
    setIsScanning(true);
    soundEffects.playScan();
    setTimeout(() => {
      setIsScanning(false);
      soundEffects.playAffirmative();
      addLog('system', 'Diagnostic scan complete. Zero structural anomalies or unauthorized signals detected.');
    }, 2400);
  };

  const toggleOverclock = () => {
    setIsOverclocked((prev) => {
      const next = !prev;
      if (next) {
        soundEffects.playWarning();
        setCorePower(7.8);
        setTemperature(680);
        setPlasmaStability(88.2);
        setEfficiency(104.5);
        addLog('alert', 'OVERCLOCK MODE ENGAGED. Core power amplified to 7.8 GW. Thermal dissipation at threshold.');
      } else {
        soundEffects.playAffirmative();
        setCorePower(3.2);
        setTemperature(412);
        setPlasmaStability(99.4);
        setEfficiency(98.7);
        addLog('system', 'Core harmonics stabilized to nominal 3.2 GW peacetime standby.');
      }
      return next;
    });
  };

  const toggleProtocol = (id: string) => {
    setProtocols((prev) => {
      const target = prev.find((p) => p.id === id);
      const next = !target?.active;
      addLog('protocol', `Protocol [${target?.name || id}] status changed to: ${next ? 'ENGAGED' : 'DISENGAGED'}`);

      // Sync with server tool state
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${next ? 'Enable' : 'Disable'} protocol ${id}`,
          sessionId,
          stream: false,
          context: { sector: 'command' }
        })
      })
        .then(() => {
          fetch('/api/protocols')
            .then((r) => r.json())
            .then((d) => {
              if (d?.protocols) setProtocols(d.protocols);
            })
            .catch(() => {});
        })
        .catch(() => {});

      return prev.map((p) => (p.id === id ? { ...p, active: next } : p));
    });
  };

  const toggleArmorDeploy = (id: string) => {
    setArmors((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const nextStatus = a.status === 'Deployed' ? 'Standby' : 'Deployed';
          soundEffects.playDeploy();
          addLog('system', `Armor unit [${a.designation}: ${a.name}] status: ${nextStatus.toUpperCase()}`);
          return { ...a, status: nextStatus };
        }
        return a;
      })
    );
  };

  const addDirective = (text: string) => {
    if (!text.trim()) return;
    const newDir: StarkDirective = {
      id: Date.now().toString(),
      title: text.trim(),
      category: 'Research',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      completed: false,
      priority: 'high'
    };
    setDirectives((prev) => [newDir, ...prev]);
    soundEffects.playAffirmative();
    addLog('system', `Tactical directive recorded: "${text.trim()}"`);
  };

  const toggleDirective = (id: string) => {
    setDirectives((prev) =>
      prev.map((d) => (d.id === id ? { ...d, completed: !d.completed } : d))
    );
  };

  const deleteDirective = (id: string) => {
    setDirectives((prev) => prev.filter((d) => d.id !== id));
    addLog('system', 'Directive removed from task matrix.');
  };

  const toggleVoice = () => {
    if (isListening) {
      speechService.stopListening();
      addLog('system', 'Audio recognition paused.');
    } else {
      speechService.startListening((transcript) => {
        executeCommand(transcript);
      });
      soundEffects.playChime();
      addLog('system', 'Vocal synthesis sensor listening...');
    }
  };

  return (
    <AppShell
      currentSector={currentSector}
      onSelectSector={(s) => {
        setCurrentSector(s);
        try {
          localStorage.setItem('jarvis_active_sector', s);
        } catch {}
      }}
      isMuted={isMuted}
      onToggleMute={() => setIsMuted(!isMuted)}
      apiProviderName={apiProviderName}
      isApiOnline={isApiOnline}
      educationRole={educationRole}
      onToggleEducationRole={() => {
        if (educationRole === 'student') setEducationRole('teacher');
        else if (educationRole === 'teacher') setEducationRole('principal');
        else setEducationRole('student');
      }}
    >
      {currentSector === 'command' && (
        <CommandDeckSector
          corePower={corePower}
          temperature={temperature}
          plasmaStability={plasmaStability}
          efficiency={efficiency}
          isOverclocked={isOverclocked}
          isScanning={isScanning}
          isSpeaking={isSpeaking}
          isListening={isListening}
          isTransmitting={isTransmitting}
          activeSuit={activeSuit}
          armors={armors}
          protocols={protocols}
          directives={directives}
          logs={logs}
          theme="cyan"
          onCoreClick={() => setCorePower((prev) => Number((prev + 0.1).toFixed(1)))}
          onRunScan={runFullScan}
          onToggleOverclock={toggleOverclock}
          onToggleProtocol={toggleProtocol}
          onSelectSuit={(suit) => setActiveSuit(suit)}
          onToggleArmorDeploy={toggleArmorDeploy}
          onAddDirective={addDirective}
          onToggleDirective={toggleDirective}
          onDeleteDirective={deleteDirective}
          onToggleVoice={toggleVoice}
          onExecuteCommand={executeCommand}
          onClearLogs={() => setLogs([])}
        />
      )}

      {currentSector === 'education' && (
        <EducationSector
          currentRole={educationRole}
          onToggleRole={(newRole) => {
            if (newRole) {
              setEducationRole(newRole);
            } else {
              if (educationRole === 'student') setEducationRole('teacher');
              else if (educationRole === 'teacher') setEducationRole('principal');
              else setEducationRole('student');
            }
          }}
          onSendChatMessage={sendChatMessage}
        />
      )}

      {currentSector === 'research' && (
        <ResearchSector
          onSendChatMessage={sendChatMessage}
        />
      )}
    </AppShell>
  );
}
export default App;
