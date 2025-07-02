export interface ChangeHighlight {
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
}

export interface ProcessedComparisonImage {
  originalImageUrl: string;
  highlightedImageUrl: string;
  changes: ChangeHighlight[];
}

export class ImageProcessingService {
  
  // Create a canvas with red circles highlighting changes
  static async addHighlightsToImage(
    imageUrl: string, 
    highlights: ChangeHighlight[]
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        
        // Draw red circles around changes
        highlights.forEach(highlight => {
          ctx.strokeStyle = '#EF4444'; // Red color
          ctx.lineWidth = 4;
          ctx.setLineDash([]);
          
          // Draw circle around the change area
          const centerX = highlight.x + highlight.width / 2;
          const centerY = highlight.y + highlight.height / 2;
          const radius = Math.max(highlight.width, highlight.height) / 2 + 20;
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          ctx.stroke();
          
          // Add a small label
          ctx.fillStyle = '#EF4444';
          ctx.font = '16px Arial';
          ctx.fillText('CHANGE', centerX - 30, centerY - radius - 10);
        });
        
        resolve(canvas.toDataURL());
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }
  
  // Parse AI response to extract change coordinates
  static parseChangeLocations(aiResponse: string): ChangeHighlight[] {
    const changes: ChangeHighlight[] = [];
    
    // Look for coordinate patterns in the AI response
    // Format: [x:123, y:456, w:78, h:90, desc:"Volume statement removed"]
    const coordinatePattern = /\[x:(\d+),\s*y:(\d+),\s*w:(\d+),\s*h:(\d+),\s*desc:"([^"]+)"\]/g;
    let match;
    
    while ((match = coordinatePattern.exec(aiResponse)) !== null) {
      changes.push({
        x: parseInt(match[1]),
        y: parseInt(match[2]),
        width: parseInt(match[3]),
        height: parseInt(match[4]),
        description: match[5]
      });
    }
    
    return changes;
  }
  
  // Create side-by-side comparison image
  static async createComparisonImage(
    currentImageUrl: string,
    proposedImageUrl: string,
    changes: ChangeHighlight[]
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const currentImg = new Image();
      const proposedImg = new Image();
      let loadedCount = 0;
      
      const onImageLoad = () => {
        loadedCount++;
        if (loadedCount === 2) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          const maxHeight = Math.max(currentImg.height, proposedImg.height);
          canvas.width = currentImg.width + proposedImg.width + 40; // 40px gap
          canvas.height = maxHeight + 100; // Extra space for labels
          
          // White background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw labels
          ctx.fillStyle = '#374151';
          ctx.font = 'bold 24px Arial';
          ctx.fillText('CURRENT', 20, 30);
          ctx.fillText('PROPOSED', currentImg.width + 60, 30);
          
          // Draw images
          ctx.drawImage(currentImg, 20, 50);
          ctx.drawImage(proposedImg, currentImg.width + 60, 50);
          
          // Highlight changes on both images
          changes.forEach(change => {
            // Current image highlights (show what was removed/changed)
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
              20 + change.x, 
              50 + change.y, 
              change.width, 
              change.height
            );
            
            // Proposed image highlights (show what's different)
            ctx.strokeRect(
              currentImg.width + 60 + change.x, 
              50 + change.y, 
              change.width, 
              change.height
            );
          });
          
          resolve(canvas.toDataURL());
        }
      };
      
      currentImg.onload = onImageLoad;
      proposedImg.onload = onImageLoad;
      currentImg.onerror = () => reject(new Error('Failed to load current image'));
      proposedImg.onerror = () => reject(new Error('Failed to load proposed image'));
      
      currentImg.src = currentImageUrl;
      proposedImg.src = proposedImageUrl;
    });
  }
} 