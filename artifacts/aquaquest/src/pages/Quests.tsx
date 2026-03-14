import { useState } from "react";
import { 
  useGetQuests, 
  useCreateQuest, 
  useUpdateQuest, 
  useDeleteQuest, 
  getGetQuestsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Badge, Button, Input, Textarea, Select, Label, Modal, Loader } from "@/components/ui";
import { formatDepth, formatXP } from "@/lib/utils";
import { Plus, Check, X, Trash2, ArrowUpCircle, Clock, CheckCircle2, XCircle, Swords } from "lucide-react";
import { format } from "date-fns";

export default function Quests() {
  const queryClient = useQueryClient();
  const { data: quests, isLoading } = useGetQuests();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('active');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const createQuest = useCreateQuest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetQuestsQueryKey() });
        setIsCreateModalOpen(false);
      }
    }
  });

  const updateQuest = useUpdateQuest({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetQuestsQueryKey() })
    }
  });

  const deleteQuest = useDeleteQuest({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetQuestsQueryKey() })
    }
  });

  if (isLoading) return <Loader />;

  const filteredQuests = quests?.filter(q => filter === 'all' || q.status === filter) || [];

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createQuest.mutate({
      data: {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        difficulty: formData.get('difficulty') as any,
        xpReward: Number(formData.get('xpReward')),
        depthLevel: Number(formData.get('depthLevel')),
      }
    });
  };

  const difficultyColors: Record<string, "default" | "success" | "warning" | "danger" | "purple"> = {
    easy: "success",
    medium: "warning",
    hard: "danger",
    legendary: "purple"
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-white mb-2 flex items-center gap-3">
            <Swords className="w-8 h-8 text-primary" /> Logbook
          </h1>
          <p className="text-muted-foreground">Manage your deep sea exploration missions.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="w-5 h-5" /> New Quest
        </Button>
      </div>

      <div className="flex gap-2 p-1 bg-card/50 rounded-xl w-fit border border-border/50 backdrop-blur-md">
        {(['all', 'active', 'completed', 'failed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
              filter === f 
                ? 'bg-primary text-primary-foreground shadow-[0_0_10px_rgba(14,116,144,0.3)]' 
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filteredQuests.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl border-dashed">
          <div className="w-20 h-20 bg-background/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
            <Swords className="w-10 h-10 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-xl font-display font-bold text-foreground mb-2">No quests found</h3>
          <p className="text-muted-foreground">Your logbook is empty for this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredQuests.map((quest) => (
            <Card key={quest.id} className="flex flex-col group relative overflow-hidden hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
              {/* Status Indicator Bar */}
              <div className={`absolute top-0 left-0 w-full h-1 ${
                quest.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 
                quest.status === 'failed' ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]' : 
                'bg-primary shadow-[0_0_10px_#0e7490]'
              }`} />
              
              <div className="flex justify-between items-start mb-4">
                <Badge variant={difficultyColors[quest.difficulty] || "default"}>
                  {quest.difficulty}
                </Badge>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <ArrowUpCircle className="w-4 h-4 text-accent" /> {formatDepth(quest.depthLevel)}
                </div>
              </div>

              <h3 className="text-xl font-display font-bold text-white mb-2 group-hover:text-primary transition-colors">{quest.title}</h3>
              <p className="text-muted-foreground text-sm flex-1 mb-6">{quest.description}</p>

              <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-auto">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Reward</span>
                  <span className="font-bold text-yellow-500 text-glow">{formatXP(quest.xpReward)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {quest.status === 'active' && (
                    <>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20"
                        onClick={() => updateQuest.mutate({ id: quest.id, data: { status: 'completed' } })}
                        title="Mark Completed"
                      >
                        <Check className="w-5 h-5" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20"
                        onClick={() => updateQuest.mutate({ id: quest.id, data: { status: 'failed' } })}
                        title="Mark Failed"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                  {(quest.status === 'completed' || quest.status === 'failed') && (
                    <div className="px-3 py-1 rounded-full bg-background flex items-center gap-2 text-sm font-medium border border-border">
                      {quest.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                      <span className="capitalize">{quest.status}</span>
                    </div>
                  )}
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      if(confirm('Delete this quest?')) deleteQuest.mutate({ id: quest.id });
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 text-[10px] text-muted-foreground/50 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Added {format(new Date(quest.createdAt), 'MMM d, yyyy')}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        title="New Quest"
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <Label htmlFor="title">Quest Title</Label>
            <Input id="title" name="title" required placeholder="e.g. Find the Lost Anchor" />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" required placeholder="Details about the mission..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select id="difficulty" name="difficulty" required>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="legendary">Legendary</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="depthLevel">Target Depth (m)</Label>
              <Input id="depthLevel" name="depthLevel" type="number" required min="0" placeholder="e.g. 500" />
            </div>
          </div>
          <div>
            <Label htmlFor="xpReward">XP Reward</Label>
            <Input id="xpReward" name="xpReward" type="number" required min="10" placeholder="e.g. 150" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createQuest.isPending}>Create Quest</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
