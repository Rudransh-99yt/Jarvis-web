import { authClient } from './authClient.ts';
import type {
  KnowledgeAsset,
  AssetSearchCriteria,
  ReuseDecision,
  QuestionSetReuseRequest
} from '../types/knowledgeAsset.ts';

export interface GenerateOrReuseRequest {
  subject: string;
  topic: string;
  educationLevel?: string;
  difficulty?: string;
  questionCount?: number;
  contextId?: string;
  institutionId?: string;
  generatePdf?: boolean;
  sharedWithInstitution?: boolean;
}

export interface GenerateOrReuseResult {
  decision: 'REUSE' | 'ADAPT' | 'GENERATE';
  reusedCount: number;
  generatedCount: number;
  totalCount: number;
  asset?: KnowledgeAsset;
  sourceAsset?: KnowledgeAsset;
  pdfStorageKey?: string;
  pdfSize?: number;
  questions: any[];
  explanations?: string[];
  reasons: string[];
}

class KnowledgeAssetClient {
  private getHeaders(): Record<string, string> {
    const authHeaders = authClient.getAuthHeaders();
    return {
      'Content-Type': 'application/json',
      ...authHeaders
    };
  }

  async searchAssets(criteria: AssetSearchCriteria = {}): Promise<KnowledgeAsset[]> {
    try {
      const params = new URLSearchParams();
      if (criteria.subject) params.set('subject', criteria.subject);
      if (criteria.topic) params.set('topic', criteria.topic);
      if (criteria.educationLevel) params.set('educationLevel', criteria.educationLevel);
      if (criteria.difficulty) params.set('difficulty', criteria.difficulty);
      if (criteria.assetType) params.set('assetType', criteria.assetType);
      if (criteria.contextId) params.set('contextId', criteria.contextId);
      if (criteria.minQuestionCount !== undefined) params.set('minQuestionCount', criteria.minQuestionCount.toString());
      if (criteria.reusableOnly) params.set('reusableOnly', 'true');

      const url = `/api/education/knowledge-assets${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: this.getHeaders()
      });

      if (!res.ok) {
        throw new Error(`Failed to search knowledge assets: ${res.statusText}`);
      }

      const data = await res.json();
      return Array.isArray(data.assets) ? data.assets : [];
    } catch (err) {
      console.error('KnowledgeAssetClient.searchAssets error:', err);
      return [];
    }
  }

  async getAssetById(id: string): Promise<KnowledgeAsset | null> {
    try {
      const res = await fetch(`/api/education/knowledge-assets/${encodeURIComponent(id)}`, {
        headers: this.getHeaders()
      });

      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`Failed to get asset: ${res.statusText}`);
      }

      const data = await res.json();
      return data.asset || null;
    } catch (err) {
      console.error('KnowledgeAssetClient.getAssetById error:', err);
      return null;
    }
  }

  async evaluateReuse(request: QuestionSetReuseRequest): Promise<ReuseDecision | null> {
    try {
      const res = await fetch('/api/education/knowledge-assets/evaluate-reuse', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request)
      });

      if (!res.ok) {
        throw new Error(`Failed to evaluate reuse: ${res.statusText}`);
      }

      const data = await res.json();
      return data.decision || null;
    } catch (err) {
      console.error('KnowledgeAssetClient.evaluateReuse error:', err);
      return null;
    }
  }

  async generateOrReuse(request: GenerateOrReuseRequest): Promise<GenerateOrReuseResult> {
    const res = await fetch('/api/education/knowledge-assets/generate-or-reuse', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || `Request failed with status ${res.status}`);
    }

    return await res.json();
  }

  async generatePdfFromAsset(assetId: string, questionCount: number = 20): Promise<{
    success: boolean;
    assetId: string;
    storageKey: string;
    questionCount: number;
    sizeBytes: number;
  }> {
    const res = await fetch(`/api/education/knowledge-assets/${encodeURIComponent(assetId)}/pdf`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ questionCount })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.error || 'Failed to generate PDF from asset');
    }

    return await res.json();
  }

  getPdfUrl(assetId: string, download: boolean = false): string {
    const currentUser = authClient.getCurrentUser();
    const userIdParam = currentUser?.id ? `userId=${encodeURIComponent(currentUser.id)}` : '';
    const downloadParam = download ? 'download=true' : 'download=false';
    const query = [downloadParam, userIdParam].filter(Boolean).join('&');
    return `/api/education/knowledge-assets/${encodeURIComponent(assetId)}/pdf?${query}`;
  }

  async downloadPdfBlob(assetId: string, filename?: string): Promise<void> {
    const res = await fetch(`/api/education/knowledge-assets/${encodeURIComponent(assetId)}/pdf?download=true`, {
      headers: this.getHeaders()
    });

    if (!res.ok) {
      throw new Error('Failed to download PDF stream');
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || `knowledge_asset_${assetId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  }
}

export const knowledgeAssetClient = new KnowledgeAssetClient();
