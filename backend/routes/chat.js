import { Router } from 'express';
import { repos } from '../repositories/index.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { chatWithGroq, isGroqConfigured, getGroqModel } from '../services/groqService.js';
import { buildChatContext, buildSystemPrompt } from '../services/chatContextService.js';
import {
  isExternalTalentIntent,
  extractSkills,
  buildExternalSearchLinks,
  findInternalBySkills,
  formatExternalTalentAugment,
} from '../services/externalTalentService.js';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({
    enabled: isGroqConfigured(),
    model: isGroqConfigured() ? getGroqModel() : null,
    provider: 'Groq',
  });
});

router.post('/', optionalAuth, async (req, res) => {
  try {
    if (!isGroqConfigured()) {
      return res.status(503).json({
        error: 'Groq API is not configured',
        code: 'GROQ_NOT_CONFIGURED',
        hint: 'Add GROQ_API_KEY to backend/.env and restart the server',
      });
    }

    const {
      message,
      history = [],
      pathname = '/',
      pcpRole,
      businessUnit,
      userId,
      systemRole,
    } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const context = await buildChatContext({
      pcpRole: pcpRole || req.auth?.pcpRole || 'Requester',
      businessUnit: businessUnit || req.auth?.businessUnit || '',
      userId: userId || req.auth?.sub,
      systemRole: systemRole || req.auth?.systemRole || 'Manager',
      pathname,
    });

    let systemPrompt = buildSystemPrompt(context);
    const trimmedHistory = history
      .map((m) => ({
        role: m.role,
        content: String(m.content || m.text || '').trim(),
      }))
      .filter((m) => m.content && (m.role === 'user' || m.role === 'bot'))
      .slice(-12);

    const externalIntent = isExternalTalentIntent(message);
    let links;

    if (externalIntent) {
      const skills = extractSkills(message);
      const employees = await repos.employees.getAll();
      const internalMatches = findInternalBySkills(employees, skills);
      links = buildExternalSearchLinks(skills, 'UAE');
      systemPrompt += `\n\n${formatExternalTalentAugment({
        skills,
        internalMatches: internalMatches.map((e) => ({
          fullName: e.fullName,
          designation: e.designation,
          department: e.department,
          skills: e.skills,
          status: e.status,
        })),
        searchLinks: links,
        enableSearch: false,
      })}`;
    }

    const messages = [
      ...trimmedHistory,
      { role: 'user', content: message.trim() },
    ];

    const result = await chatWithGroq({ systemPrompt, messages });

    res.json({
      text: result.text,
      source: `Groq (${result.model}) · Descon database snapshot`,
      links,
      ai: true,
    });
  } catch (err) {
    if (err.code === 'GROQ_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message, code: err.code });
    }
    console.error('Chat/Groq error:', err.message);
    res.status(err.status === 429 ? 429 : 500).json({
      error: err.message || 'Failed to get AI response',
    });
  }
});

export default router;
