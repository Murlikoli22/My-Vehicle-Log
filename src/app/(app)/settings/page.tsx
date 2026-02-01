
'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Skeleton } from '@/components/ui/skeleton';

const colorThemes = [
    { name: 'Green', value: 'theme-green' },
    { name: 'Blue', value: 'theme-blue' },
    { name: 'Rose', value: 'theme-rose' },
]

export default function SettingsPage() {
  const [mounted, setMounted] = React.useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  
  // The color theme is managed separately from light/dark mode.
  // We use localStorage to persist it and apply a class to the html element.
  const [colorTheme, setColorTheme] = React.useState('theme-green');

  React.useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('color-theme') || 'theme-green';
    setColorTheme(savedTheme);
    document.documentElement.classList.remove(...colorThemes.map(t => t.value));
    document.documentElement.classList.add(savedTheme);
  }, []);

  const handleColorThemeChange = (value: string) => {
    setColorTheme(value);
    localStorage.setItem('color-theme', value);
    document.documentElement.classList.remove(...colorThemes.map(t => t.value));
    document.documentElement.classList.add(value);
  };

  if (!mounted) {
    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-4 w-80" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                       <Skeleton className="h-6 w-20" />
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-9 w-24" />
                            <Skeleton className="h-9 w-24" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-10 w-48" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize the look and feel of the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="theme-mode" className="font-medium">Mode</Label>
            <div className="flex items-center gap-2">
              <Button
                id="theme-mode"
                variant={resolvedTheme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
                className="w-24"
              >
                <Sun className="mr-2 h-4 w-4" /> Light
              </Button>
              <Button
                variant={resolvedTheme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
                className="w-24"
              >
                <Moon className="mr-2 h-4 w-4" /> Dark
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="color-theme" className="font-medium">Color Theme</Label>
            <Select onValueChange={handleColorThemeChange} value={colorTheme}>
                <SelectTrigger id="color-theme" className="w-48">
                    <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                    {colorThemes.map(theme => (
                         <SelectItem key={theme.value} value={theme.value}>{theme.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
