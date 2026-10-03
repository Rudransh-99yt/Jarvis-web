import { StarkProtocol, ArmorMark, StarkDirective } from '../types';

export interface CommandResult {
  reply: string;
  action?: 'SCAN' | 'THEME_CHANGE' | 'PROTOCOL_TOGGLE' | 'ARMOR_SELECT' | 'CLEAR_LOGS' | 'ADD_DIRECTIVE' | 'ALARM';
  payload?: any;
}

export function processJarvisCommand(
  rawInput: string,
  state: {
    protocols: StarkProtocol[];
    armors: ArmorMark[];
    directives: StarkDirective[];
  }
): CommandResult {
  const input = rawInput.trim().toLowerCase();

  // 1. Diagnostics / System Scan
  if (
    input.includes('status') ||
    input.includes('diagnostic') ||
    input.includes('system check') ||
    input.includes('scan') ||
    input.includes('health')
  ) {
    return {
      reply: 'Initiating full diagnostic sweep. Arc reactor output is steady at 3.2 gigawatts. Repulsor capacitors at 98%. Neural telemetry is fully nominal, sir.',
      action: 'SCAN'
    };
  }

  // 2. Protocols
  if (input.includes('house party')) {
    return {
      reply: 'Protocol House Party engaged. All automated armor chassis have been unsealed and deployed from the subterranean vault.',
      action: 'PROTOCOL_TOGGLE',
      payload: 'house_party'
    };
  }

  if (input.includes('clean slate')) {
    return {
      reply: 'Clean Slate protocol initiated. System caches purged and non-essential telemetry isolated, sir.',
      action: 'PROTOCOL_TOGGLE',
      payload: 'clean_slate'
    };
  }

  if (input.includes('defense') || input.includes('shield') || input.includes('lockdown')) {
    return {
      reply: 'Defense Matrix active. Perimeter energy shielding modulated to 100% and automated security sentries engaged.',
      action: 'PROTOCOL_TOGGLE',
      payload: 'defense_matrix'
    };
  }

  if (input.includes('stealth')) {
    return {
      reply: 'Stealth protocol toggled. Thermal and radar cross-section emissions reduced to sub-detectable thresholds.',
      action: 'PROTOCOL_TOGGLE',
      payload: 'stealth_mode'
    };
  }

  // 3. Time / Clock
  if (input.includes('time') || input.includes('clock') || input.includes('date')) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return {
      reply: `Local telemetry indicates the current time is ${timeStr}, on ${dateStr}. Global satellite synchronization is within 0.4 milliseconds.`
    };
  }

  // 4. Weather / Atmospheric Scan
  if (input.includes('weather') || input.includes('temperature') || input.includes('atmospheric') || input.includes('climate')) {
    return {
      reply: 'Atmospheric sensors report barometric pressure at 1013.2 hPa, temperature at 21.4°C (70.5°F), wind vector 12 knots heading 240 degrees. Skies are clear for flight.'
    };
  }

  // 5. Arc Reactor
  if (input.includes('reactor') || input.includes('power') || input.includes('arc core') || input.includes('battery')) {
    return {
      reply: 'The Palladium-Vibranium Arc Reactor is discharging at 3.25 gigawatts with a thermal dissipation curve well within safety tolerances. Core stability is 99.4%.'
    };
  }

  // 6. Identity / Greeting
  if (
    input.includes('who are you') ||
    input.includes('what are you') ||
    input.includes('identity') ||
    input.includes('jarvis') && (input.includes('help') || input.includes('about'))
  ) {
    return {
      reply: 'I am J.A.R.V.I.S. — Just A Rather Very Intelligent System. I oversee Tony Stark\'s private cybernetic network, tactical armor telemetry, security protocols, and flight logistics.'
    };
  }

  if (input.startsWith('hello') || input.startsWith('hi') || input.startsWith('hey jarvis') || input === 'jarvis') {
    return {
      reply: 'Good day, sir. Systems are online and standing by for your directive.'
    };
  }

  // 7. Clear console
  if (input === 'clear' || input === 'clear logs' || input === 'cls') {
    return {
      reply: 'Command feed reset.',
      action: 'CLEAR_LOGS'
    };
  }

  // 8. Calculations
  const calcMatch = input.match(/(?:calculate|what is|compute)\s+([0-9+\-*/().\s^%]+)/);
  if (calcMatch && calcMatch[1]) {
    try {
      const sanitized = calcMatch[1].replace(/[^0-9+\-*/().\s]/g, '');
      // Safe math evaluation
      const res = Function(`"use strict"; return (${sanitized});`)();
      return {
        reply: `The calculated result is ${res}, sir.`
      };
    } catch {
      return {
        reply: 'The mathematical expression could not be resolved by the quantum coprocessor, sir.'
      };
    }
  }

  // 9. Specific Armor queries
  const armorMatch = state.armors.find(
    (a) =>
      input.includes(a.name.toLowerCase()) ||
      input.includes(a.id.toLowerCase()) ||
      input.includes(a.designation.toLowerCase())
  );
  if (armorMatch) {
    return {
      reply: `${armorMatch.name} (${armorMatch.designation}) is currently ${armorMatch.status.toLowerCase()}. Armor integrity is at ${armorMatch.integrity}%, equipped with ${armorMatch.features.slice(0, 2).join(' and ')}.`,
      action: 'ARMOR_SELECT',
      payload: armorMatch.id
    };
  }

  // 10. Directives / Memos
  if (input.startsWith('add directive') || input.startsWith('note') || input.startsWith('remember')) {
    const text = input.replace(/^(?:add directive|note|remember)\s*/i, '').trim();
    if (text) {
      return {
        reply: `Directive recorded in Stark Archives: "${text}".`,
        action: 'ADD_DIRECTIVE',
        payload: text
      };
    }
  }

  // 11. Flight & Repulsors
  if (input.includes('flight') || input.includes('repulsor') || input.includes('thruster') || input.includes('speed')) {
    return {
      reply: 'Repulsor flight stabilizers are calibrated. Variable pitch thrusters at 100% operational readiness. Mach 3 flight envelope authorized.'
    };
  }

  // 12. Security / Intruder alert
  if (input.includes('intruder') || input.includes('security') || input.includes('alarm')) {
    return {
      reply: 'Perimeter sweep active. Stark tower security grid has identified zero unauthorized biometric signals within 500 meters.',
      action: 'ALARM'
    };
  }

  // Default intelligent contextual response
  const genericReplies = [
    `I have logged your request: "${rawInput}". Executing background analysis across the Stark private mesh network, sir.`,
    `Directive acknowledged, sir. Processing across auxiliary mainframe nodes.`,
    `Understood, sir. Sensors and sub-routines are aligned with your specification.`
  ];
  const chosen = genericReplies[Math.floor(Math.random() * genericReplies.length)];

  return {
    reply: chosen
  };
}
