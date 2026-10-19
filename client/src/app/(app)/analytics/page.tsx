
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
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

const taskVelocityData = [
  { date: '2023-01-01', completed: 2 },
  { date: '2023-01-02', completed: 3 },
  { date: '2023-01-03', completed: 1 },
  { date: '2023-01-04', completed: 5 },
  { date: '2023-01-05', completed: 4 },
  { date: '2023-01-06', completed: 6 },
  { date: '2023-01-07', completed: 2 },
];

const contributionData = [
  { name: 'Alex', tasks: 12, fill: 'var(--color-alex)' },
  { name: 'Sarah', tasks: 8, fill: 'var(--color-sarah)' },
  { name: 'David', tasks: 15, fill: 'var(--color-david)' },
  { name: 'Maria', tasks: 5, fill: 'var(--color-maria)' },
];

const milestoneData = [
  { name: 'Milestone 1', progress: 100, fill: 'var(--color-m1)' },
  { name: 'Milestone 2', progress: 75, fill: 'var(--color-m2)' },
  { name: 'Milestone 3', progress: 30, fill: 'var(--color-m3)' },
];

const chartConfig = {
  alex: {
    label: 'Alex',
    color: 'hsl(var(--chart-1))',
  },
  sarah: {
    label: 'Sarah',
    color: 'hsl(var(--chart-2))',
  },
  david: {
    label: 'David',
    color: 'hsl(var(--chart-3))',
  },
  maria: {
    label: 'Maria',
    color: 'hsl(var(--chart-4))',
  },
  m1: {
    color: 'hsl(var(--chart-1))',
  },
  m2: {
    color: 'hsl(var(--chart-2))',
  },
  m3: {
    color: 'hsl(var(--chart-3))',
  },
};

export default function AnalyticsPage() {
  const reportRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    const input = reportRef.current;
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

      pdf.text('Project Analytics Report', pdfWidth / 2, y + 15, { align: 'center' });
      pdf.addImage(imgData, 'PNG', 10, y + 30, width, height);
      pdf.save('analytics-report.pdf');
      toast.success('Report downloaded');
    } catch (error) {
      console.error('Failed to export analytics report:', error);
      toast.error('Could not export the report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Project Analytics</h1>
          <p className="text-muted-foreground">
            Visualize your team's performance and project progress.
          </p>
        </div>
        <RainbowButton onClick={handleExportPdf} disabled={exporting}>
          <FileDown className="mr-2 h-4 w-4" />
          {exporting ? 'Preparing report…' : 'Export Report'}
        </RainbowButton>
      </div>

      <div ref={reportRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 bg-background">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Task Velocity</CardTitle>
            <CardDescription>
              Number of tasks completed over time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={taskVelocityData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    content={<ChartTooltipContent />}
                    cursor={{
                      stroke: 'hsl(var(--primary))',
                      strokeWidth: 2,
                      strokeDasharray: '3 3',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contribution Breakdown</CardTitle>
            <CardDescription>Tasks completed per team member.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Pie data={contributionData} dataKey="tasks" nameKey="name" />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Milestone Completion</CardTitle>
            <CardDescription>
              Progress towards project milestones.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={milestoneData}
                  innerRadius="30%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={450}
                >
                  <PolarAngleAxis
                    type="number"
                    domain={[0, 100]}
                    angleAxisId={0}
                    tick={false}
                  />
                  <RadialBar
                    background
                    dataKey="progress"
                    angleAxisId={0}
                    label={{
                      position: 'insideStart',
                      fill: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                </RadialBarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
