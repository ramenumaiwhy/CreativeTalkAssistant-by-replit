import { useRef, useEffect } from "react";

interface MindMapProps {
  keyPoints: string[];
  title: string;
}

export default function MindMap({ keyPoints, title }: MindMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current || keyPoints.length === 0) return;
    
    const width = 500;
    const height = 200;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Clear existing content
    const svg = svgRef.current;
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }
    
    // Create central node
    const centralGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    
    const centralNode = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    centralNode.setAttribute("cx", centerX.toString());
    centralNode.setAttribute("cy", centerY.toString());
    centralNode.setAttribute("rx", "70");
    centralNode.setAttribute("ry", "30");
    centralNode.setAttribute("fill", "#7c3aed");
    centralNode.setAttribute("opacity", "0.2");
    centralNode.setAttribute("stroke", "#7c3aed");
    centralNode.setAttribute("stroke-width", "1");
    
    const centralText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    centralText.setAttribute("x", centerX.toString());
    centralText.setAttribute("y", (centerY + 5).toString());
    centralText.setAttribute("text-anchor", "middle");
    centralText.setAttribute("font-size", "12");
    centralText.setAttribute("fill", "#4c1d95");
    centralText.textContent = title;
    
    centralGroup.appendChild(centralNode);
    centralGroup.appendChild(centralText);
    svg.appendChild(centralGroup);
    
    // Create branches and nodes for each key point
    const maxPoints = Math.min(keyPoints.length, 6); // Limit to 6 points
    const angleStep = (2 * Math.PI) / maxPoints;
    const radius = 120;
    
    const colors = [
      { fill: "#10b981", stroke: "#10b981", textFill: "#064e3b" }, // Green
      { fill: "#f59e0b", stroke: "#f59e0b", textFill: "#78350f" }, // Yellow
      { fill: "#3b82f6", stroke: "#3b82f6", textFill: "#1e40af" }, // Blue
      { fill: "#ef4444", stroke: "#ef4444", textFill: "#7f1d1d" }, // Red
      { fill: "#8b5cf6", stroke: "#8b5cf6", textFill: "#4c1d95" }, // Purple
      { fill: "#ec4899", stroke: "#ec4899", textFill: "#831843" }  // Pink
    ];
    
    for (let i = 0; i < maxPoints; i++) {
      const angle = i * angleStep;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      // Create line
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", centerX.toString());
      line.setAttribute("y1", centerY.toString());
      line.setAttribute("x2", x.toString());
      line.setAttribute("y2", y.toString());
      line.setAttribute("stroke", "#9ca3af");
      line.setAttribute("stroke-width", "1.5");
      svg.appendChild(line);
      
      // Create node group
      const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      
      const node = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
      node.setAttribute("cx", x.toString());
      node.setAttribute("cy", y.toString());
      node.setAttribute("rx", "60");
      node.setAttribute("ry", "25");
      node.setAttribute("fill", colors[i % colors.length].fill);
      node.setAttribute("opacity", "0.2");
      node.setAttribute("stroke", colors[i % colors.length].stroke);
      node.setAttribute("stroke-width", "1");
      
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x.toString());
      text.setAttribute("y", (y + 5).toString());
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", "10");
      text.setAttribute("fill", colors[i % colors.length].textFill);
      
      // Truncate text if too long
      const pointText = keyPoints[i];
      text.textContent = pointText.length > 15 ? pointText.substring(0, 15) + "..." : pointText;
      
      nodeGroup.appendChild(node);
      nodeGroup.appendChild(text);
      svg.appendChild(nodeGroup);
    }
  }, [keyPoints, title]);
  
  return (
    <div className="flex items-center justify-center h-full">
      <svg 
        ref={svgRef}
        width="100%" 
        height="100%" 
        viewBox="0 0 500 200" 
        xmlns="http://www.w3.org/2000/svg"
      />
    </div>
  );
}
