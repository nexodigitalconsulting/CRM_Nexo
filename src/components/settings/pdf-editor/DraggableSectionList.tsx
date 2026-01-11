import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  GripVertical, Building2, FileText, Calendar, User, 
  Table2, DollarSign, FileSignature, Scale, PenTool,
  Lock, StickyNote, Eye, EyeOff
} from 'lucide-react';
import { PdfBlock, BlockType } from './types';
import { cn } from '@/lib/utils';

interface DraggableSectionListProps {
  blocks: PdfBlock[];
  onBlocksChange: (blocks: PdfBlock[]) => void;
  selectedBlockId: BlockType | null;
  onSelectBlock: (blockId: BlockType) => void;
  documentType: 'invoice' | 'quote' | 'contract';
}

const iconMap: Record<string, React.ReactNode> = {
  Building2: <Building2 className="h-4 w-4" />,
  FileText: <FileText className="h-4 w-4" />,
  Calendar: <Calendar className="h-4 w-4" />,
  User: <User className="h-4 w-4" />,
  Table2: <Table2 className="h-4 w-4" />,
  DollarSign: <DollarSign className="h-4 w-4" />,
  FileSignature: <FileSignature className="h-4 w-4" />,
  Scale: <Scale className="h-4 w-4" />,
  PenTool: <PenTool className="h-4 w-4" />,
  StickyNote: <StickyNote className="h-4 w-4" />,
};

export function DraggableSectionList({
  blocks,
  onBlocksChange,
  selectedBlockId,
  onSelectBlock,
  documentType,
}: DraggableSectionListProps) {
  const [draggedId, setDraggedId] = useState<BlockType | null>(null);
  const [dragOverId, setDragOverId] = useState<BlockType | null>(null);
  const draggedRef = useRef<BlockType | null>(null);

  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  const handleDragStart = (e: React.DragEvent, block: PdfBlock) => {
    if (block.locked) {
      e.preventDefault();
      return;
    }
    setDraggedId(block.id);
    draggedRef.current = block.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', block.id);
    
    // Add a slight delay to show the drag effect
    requestAnimationFrame(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = '0.5';
      }
    });
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
    setDraggedId(null);
    setDragOverId(null);
    draggedRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent, block: PdfBlock) => {
    e.preventDefault();
    if (block.locked || block.id === draggedRef.current) return;
    setDragOverId(block.id);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetBlock: PdfBlock) => {
    e.preventDefault();
    if (targetBlock.locked || !draggedRef.current) return;

    const draggedBlockId = draggedRef.current;
    const draggedBlock = blocks.find(b => b.id === draggedBlockId);
    if (!draggedBlock) return;

    // Calculate new order
    const newBlocks = blocks.map(block => {
      if (block.locked) return block;
      
      if (block.id === draggedBlockId) {
        return { ...block, order: targetBlock.order };
      }
      
      // Shift other blocks
      if (draggedBlock.order < targetBlock.order) {
        // Moving down
        if (block.order > draggedBlock.order && block.order <= targetBlock.order) {
          return { ...block, order: block.order - 1 };
        }
      } else {
        // Moving up
        if (block.order >= targetBlock.order && block.order < draggedBlock.order) {
          return { ...block, order: block.order + 1 };
        }
      }
      
      return block;
    });

    onBlocksChange(newBlocks);
    setDragOverId(null);
    setDraggedId(null);
  };

  const handleVisibilityChange = (blockId: BlockType, visible: boolean) => {
    onBlocksChange(
      blocks.map(b => b.id === blockId ? { ...b, visible } : b)
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Secciones del PDF
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Arrastra para reordenar, click para editar propiedades
        </p>
      </CardHeader>
      <CardContent className="space-y-1">
        {sortedBlocks.map((block, index) => (
          <div
            key={block.id}
            draggable={!block.locked}
            onDragStart={(e) => handleDragStart(e, block)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, block)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, block)}
            onClick={() => onSelectBlock(block.id)}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer',
              selectedBlockId === block.id 
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                : 'border-border hover:border-primary/50 hover:bg-muted/50',
              draggedId === block.id && 'opacity-50',
              dragOverId === block.id && 'border-primary border-dashed bg-primary/10',
              !block.visible && 'opacity-60',
              block.locked && 'cursor-default'
            )}
          >
            {/* Drag Handle */}
            <div className={cn(
              'text-muted-foreground',
              block.locked ? 'cursor-not-allowed opacity-40' : 'cursor-grab active:cursor-grabbing'
            )}>
              {block.locked ? (
                <Lock className="h-4 w-4" />
              ) : (
                <GripVertical className="h-4 w-4" />
              )}
            </div>

            {/* Icon */}
            <div className={cn(
              'p-2 rounded-md',
              block.visible 
                ? 'bg-primary/10 text-primary' 
                : 'bg-muted text-muted-foreground'
            )}>
              {iconMap[block.icon]}
            </div>

            {/* Label */}
            <span className={cn(
              'font-medium flex-1',
              !block.visible && 'text-muted-foreground'
            )}>
              {block.label}
            </span>

            {/* Order badge */}
            <Badge variant="outline" className="text-xs px-2 py-0 font-mono">
              {index + 1}
            </Badge>

            {/* Visibility toggle */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2"
            >
              {block.visible ? (
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <Switch
                checked={block.visible}
                onCheckedChange={(v) => handleVisibilityChange(block.id, v)}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>
        ))}

        <p className="text-xs text-muted-foreground pt-2 text-center">
          💡 Las secciones bloqueadas no pueden moverse
        </p>
      </CardContent>
    </Card>
  );
}
