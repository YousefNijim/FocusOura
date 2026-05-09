import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { fetchApi } from "@/utils/api";
import {
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  MoreVertical,
  X,
  ChevronRight,
  BookOpen,
  GraduationCap
} from "lucide-react";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";

interface CalendarItem {
  id: string;
  title: string;
  type: "exam" | "homework" | "other";
  dueDate: string;
  completed: boolean;
  subjectId?: string;
  subjectName?: string;
  accentColor?: string;
}

export function CalendarSection() {
  const { subjects } = useUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    title: "",
    type: "homework" as const,
    dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    subjectId: subjects[0]?.id || ""
  });

  const { data: items = [], isLoading } = useQuery<CalendarItem[]>({
    queryKey: ["calendar"],
    queryFn: () => fetchApi("/calendar"),
  });

  const addMutation = useMutation({
    mutationFn: (data: typeof newItem) => fetchApi("/calendar", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      setIsAddOpen(false);
      setNewItem({
        title: "",
        type: "homework",
        dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        subjectId: subjects[0]?.id || ""
      });
      toast({ title: "Task added to calendar" });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string, completed: boolean }) => fetchApi(`/calendar/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed })
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/calendar/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] })
  });

  const upcomingItems = items.filter(i => !i.completed).slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <CalendarIcon size={14} /> Upcoming Tasks
        </h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <button className="text-xs font-medium text-primary flex items-center gap-1 hover:underline">
              <Plus size={12} /> Add New
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Calendar Item</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input 
                  placeholder="Exam name or homework title..." 
                  value={newItem.title}
                  onChange={e => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select 
                    value={newItem.type}
                    onValueChange={val => setNewItem(prev => ({ ...prev, type: val as any }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homework">Homework</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Select 
                    value={newItem.subjectId}
                    onValueChange={val => setNewItem(prev => ({ ...prev, subjectId: val }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">General</SelectItem>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date</label>
                <Input 
                  type="datetime-local" 
                  value={newItem.dueDate}
                  onChange={e => setNewItem(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => {
                  if (!newItem.title) {
                    toast({ title: "Please enter a title", variant: "destructive" });
                    return;
                  }
                  addMutation.mutate(newItem);
                }}
                className={cn(
                  "w-full sm:w-auto transition-all duration-200",
                  (addMutation.isPending || !newItem.title) && "opacity-50"
                )}
              >
                {addMutation.isPending ? "Adding..." : "Add to Calendar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="h-24 glass rounded-2xl flex items-center justify-center">
            <span className="text-xs text-muted-foreground animate-pulse">Loading calendar...</span>
          </div>
        ) : upcomingItems.length === 0 ? (
          <div className="p-6 glass rounded-2xl flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
              <CheckCircle2 size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No upcoming exams or homework.</p>
          </div>
        ) : (
          upcomingItems.map((item) => (
            <div 
              key={item.id}
              className="glass rounded-2xl p-4 flex items-center gap-4 group hover:bg-card/80 transition-all border border-border/50"
            >
              <button 
                onClick={() => toggleMutation.mutate({ id: item.id, completed: !item.completed })}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {item.completed ? (
                  <CheckCircle2 size={20} className="text-primary" />
                ) : (
                  <Circle size={20} />
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold truncate ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {item.title}
                  </p>
                  {item.type === 'exam' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/10 text-red-500 border border-red-500/20">
                      Exam
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock size={10} />
                    <span>
                      {isToday(new Date(item.dueDate)) ? 'Today' : 
                       isTomorrow(new Date(item.dueDate)) ? 'Tomorrow' : 
                       format(new Date(item.dueDate), "MMM d")}
                      , {format(new Date(item.dueDate), "h:mm a")}
                    </span>
                  </div>
                  {item.subjectName && (
                    <div className="flex items-center gap-1 text-[11px]" style={{ color: item.accentColor }}>
                      <BookOpen size={10} />
                      <span className="font-medium">{item.subjectName}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {deleteConfirmId === item.id ? (
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => { deleteMutation.mutate(item.id); setDeleteConfirmId(null); }}
                    className="px-2 py-1 rounded-lg bg-red-500/15 text-red-600 text-[10px] font-semibold hover:bg-red-500/25 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirmId(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 text-muted-foreground transition-all"
                >
                  <MoreVertical size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
      
      {items.length > 3 && (
        <button className="w-full py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
          View All Tasks
        </button>
      )}
    </div>
  );
}
