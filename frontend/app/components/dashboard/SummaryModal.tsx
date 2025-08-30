'use client';

import { useState } from 'react';
import { auth } from '@/app/firebase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Brain, X, Loader2 } from 'lucide-react';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    startDate: string;
    endDate: string;
    groupId: string;
  };
}

interface SummaryResponse {
  summary: string;
  total_messages: number;
  date_range: string;
}

export default function SummaryModal({ isOpen, onClose, filters }: SummaryModalProps) {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const generateSummary = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await auth.currentUser?.getIdToken();
      
      const requestBody: any = {};
      if (filters.startDate) requestBody.start_date = filters.startDate;
      if (filters.endDate) requestBody.end_date = filters.endDate;
      if (filters.groupId) requestBody.group_id = filters.groupId;

      const response = await fetch('/api/messages/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || '生成摘要失敗');
      }
    } catch (error) {
      setError('網路錯誤，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center">
            <Brain className="h-6 w-6 text-green-600 mr-2" />
            <CardTitle>AI 摘要生成</CardTitle>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Filter Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">篩選條件</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">開始日期：</span>
                <span>{filters.startDate || '不限'}</span>
              </div>
              <div>
                <span className="text-gray-600">結束日期：</span>
                <span>{filters.endDate || '不限'}</span>
              </div>
              <div>
                <span className="text-gray-600">群組 ID：</span>
                <span>{filters.groupId || '不限'}</span>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          {!summary && (
            <div className="text-center">
              <Button
                onClick={generateSummary}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 px-8 py-3"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Brain className="h-5 w-5 mr-2" />
                    開始生成摘要
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Summary Display */}
          {summary && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">摘要統計</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">訊息數量：</span>
                    <span className="font-medium">{summary.total_messages}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">時間範圍：</span>
                    <span className="font-medium">{summary.date_range}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium mb-3">AI 摘要內容</h4>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {summary.summary}
                  </p>
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <Button
                  onClick={generateSummary}
                  disabled={isLoading}
                  variant="outline"
                >
                  重新生成
                </Button>
                <Button onClick={onClose}>
                  關閉
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
