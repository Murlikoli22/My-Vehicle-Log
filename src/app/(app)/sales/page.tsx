'use client';

import { salesData } from '@/lib/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export default function SalesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Data</CardTitle>
        <CardDescription>
          A view of the sample sales data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Sale</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesData.map((sale) => (
                <TableRow key={sale.orderId}>
                  <TableCell className="font-medium">{sale.orderId}</TableCell>
                  <TableCell>{sale.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{sale.region}</Badge>
                  </TableCell>
                  <TableCell>{sale.category}</TableCell>
                  <TableCell>{sale.product}</TableCell>
                  <TableCell className="text-right">{sale.units}</TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(sale.unitCost)}
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(sale.totalSale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
