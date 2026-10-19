
'use client';

import { useRef, useState } from 'react';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';

const aggregatedData = [
  { category: 'Communication', score: 8.5, fill: 'var(--color-communication)' },
  { category: 'Reliability', score: 9.2, fill: 'var(--color-reliability)' },
  { category: 'Quality of Work', score: 7.8, fill: 'var(--color-quality)' },
  { category: 'Teamwork', score: 8.9, fill: 'var(--color-teamwork)' },
];

const chartConfig = {
  score: {
    label: 'Score',
  },
  communication: {
    label: 'Communication',
    color: 'hsl(var(--chart-1))',
  },
  reliability: {
    label: 'Reliability',
    color: 'hsl(var(--chart-2))',
  },
  quality: {
    label: 'Quality of Work',
    color: 'hsl(var(--chart-3))',
  },
  teamwork: {
    label: 'Teamwork',
    color: 'hsl(var(--chart-4))',
  },
};

export default function PeerReviewPage() {
  const reviewChartRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const handleDownloadPdf = async () => {
    const input = reviewChartRef.current;
    if (!input || exporting) return;

    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(input, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'px', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      const width = pdfWidth - 20;
      const height = width / ratio;
      const y = height > pdfHeight ? 0 : 10;

      pdf.text('Aggregated Review Summary', pdfWidth / 2, y + 15, { align: 'center' });
      pdf.addImage(imgData, 'PNG', 10, y + 30, width, height);
      pdf.save('review-summary.pdf');
      toast.success('Review summary downloaded');
    } catch (error) {
      console.error('Failed to export review summary:', error);
      toast.error('Could not export the review summary. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Peer Review</h1>
        <p className="text-muted-foreground">
          Provide constructive feedback to your teammates.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Submit Feedback</CardTitle>
          <CardDescription>
            Select a teammate and provide your review. All feedback is valuable
            for growth.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="teammate">Select Teammate</Label>
            <Select>
              <SelectTrigger id="teammate">
                <SelectValue placeholder="Choose a teammate to review" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sarah">Sarah Miller</SelectItem>
                <SelectItem value="david">David Chen</SelectItem>
                <SelectItem value="maria">Maria Garcia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Communication (1-10)</Label>
              <Slider defaultValue={[8]} max={10} step={1} className="mt-2" />
            </div>
            <div>
              <Label>Reliability (1-10)</Label>
              <Slider defaultValue={[9]} max={10} step={1} className="mt-2" />
            </div>
            <div>
              <Label>Quality of Work (1-10)</Label>
              <Slider defaultValue={[7]} max={10} step={1} className="mt-2" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Comments</Label>
            <Textarea
              id="comments"
              placeholder="Provide specific examples and constructive suggestions..."
            />
          </div>

          <div className="flex justify-end">
            <RainbowButton>Submit Review</RainbowButton>
          </div>
        </CardContent>
      </Card>

      <Card ref={reviewChartRef} className="p-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Aggregated Review Results</CardTitle>
              <CardDescription>
                Summary of the feedback you've received from your team.
              </CardDescription>
            </div>
            <RainbowButton onClick={handleDownloadPdf} disabled={exporting}>
              <FileDown className="mr-2 h-4 w-4" />
              {exporting ? 'Preparing summary…' : 'Download Summary'}
            </RainbowButton>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aggregatedData} layout="vertical">
                <XAxis type="number" domain={[0, 10]} />
                <YAxis dataKey="category" type="category" width={100} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  content={<ChartTooltipContent />}
                />
                <Bar dataKey="score" radius={5}>
                  {aggregatedData.map((entry) => (
                    <Cell key={`cell-${entry.category}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
