import { useRef, useEffect } from "react";

/**
 * マインドマップのプロパティ（設定項目）
 * 
 * このインターフェースは、MindMapコンポーネントが受け取るプロパティを定義しています。
 * 
 * @property keyPoints - 表示するキーポイント（重要な点）の配列
 * @property title - マインドマップの中央に表示するタイトル
 */
interface MindMapProps {
  keyPoints: string[];
  title: string;
}

/**
 * マインドマップコンポーネント
 * 
 * このコンポーネントは、会話から抽出されたキーポイントを視覚的に表示します。
 * 中央にタイトルを配置し、その周りにキーポイントを放射状に配置します。
 * 
 * マインドマップとは、アイデアや概念を視覚的に整理する図のことで、
 * 中心から枝分かれする形で情報を表現します。これにより、情報の関連性や
 * 全体像を把握しやすくなります。
 * 
 * @param keyPoints - 表示するキーポイントの配列
 * @param title - マインドマップの中央に表示するタイトル
 */
export default function MindMap({ keyPoints, title }: MindMapProps) {
  // SVG要素への参照（「参照」とは、HTMLやSVG要素を直接操作するための仕組みです）
  const svgRef = useRef<SVGSVGElement>(null);

  /**
   * マインドマップを描画する効果
   * 
   * このuseEffectは、keyPointsまたはtitleが変更されたときに実行され、
   * SVGを使ってマインドマップを描画します。
   * 
   * SVG（Scalable Vector Graphics）とは、拡大縮小しても品質が劣化しない
   * 画像形式のことで、線や図形、テキストなどを数学的な方法で表現します。
   */
  useEffect(() => {
    // SVG要素が存在しない、またはキーポイントがない場合は何もしない
    if (!svgRef.current || keyPoints.length === 0) return;

    // マインドマップのサイズを設定
    const width = 500;  // 幅
    const height = 200; // 高さ
    const centerX = width / 2;  // 中心のX座標
    const centerY = height / 2; // 中心のY座標

    // 既存の内容をクリア（すでに描画されているものを消去）
    const svg = svgRef.current;
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    // 中央のノード（タイトルを表示する部分）を作成
    // グループ要素を作成（複数の要素をまとめるコンテナ）
    const centralGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

    // 楕円形の背景を作成
    const centralNode = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    centralNode.setAttribute("cx", centerX.toString());  // 中心のX座標
    centralNode.setAttribute("cy", centerY.toString());  // 中心のY座標
    centralNode.setAttribute("rx", "70");  // X方向の半径
    centralNode.setAttribute("ry", "30");  // Y方向の半径
    centralNode.setAttribute("fill", "#7c3aed");  // 塗りつぶしの色
    centralNode.setAttribute("opacity", "0.2");   // 透明度
    centralNode.setAttribute("stroke", "#7c3aed"); // 枠線の色
    centralNode.setAttribute("stroke-width", "1"); // 枠線の太さ

    // タイトルテキストを作成
    const centralText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    centralText.setAttribute("x", centerX.toString());  // X座標
    centralText.setAttribute("y", (centerY + 5).toString());  // Y座標（少し下にずらす）
    centralText.setAttribute("text-anchor", "middle");  // テキストの中央揃え
    centralText.setAttribute("font-size", "12");  // フォントサイズ
    centralText.setAttribute("fill", "#4c1d95");  // テキストの色
    centralText.textContent = title;  // 表示するテキスト

    // グループに背景と文字を追加
    centralGroup.appendChild(centralNode);
    centralGroup.appendChild(centralText);
    // SVGにグループを追加
    svg.appendChild(centralGroup);

    // キーポイント用のノードを作成（最大6つまで）
    const maxPoints = Math.min(keyPoints.length, 6); // 表示するキーポイントの数を制限
    const angleStep = (2 * Math.PI) / maxPoints;  // 各ノードの角度間隔
    const radius = 120;  // 中心からの距離

    // ノードの色の配列（各ノードに異なる色を設定）
    const colors = [
      { fill: "#10b981", stroke: "#10b981", textFill: "#064e3b" }, // 緑
      { fill: "#f59e0b", stroke: "#f59e0b", textFill: "#78350f" }, // 黄
      { fill: "#3b82f6", stroke: "#3b82f6", textFill: "#1e40af" }, // 青
      { fill: "#ef4444", stroke: "#ef4444", textFill: "#7f1d1d" }, // 赤
      { fill: "#8b5cf6", stroke: "#8b5cf6", textFill: "#4c1d95" }, // 紫
      { fill: "#ec4899", stroke: "#ec4899", textFill: "#831843" }  // ピンク
    ];

    // 各キーポイントに対してノードを作成
    for (let i = 0; i < maxPoints; i++) {
      // ノードの位置を計算（円周上に均等に配置）
      const angle = i * angleStep;  // 角度
      const x = centerX + radius * Math.cos(angle);  // X座標
      const y = centerY + radius * Math.sin(angle);  // Y座標

      // 中心からノードへの線を作成
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", centerX.toString());  // 線の始点X
      line.setAttribute("y1", centerY.toString());  // 線の始点Y
      line.setAttribute("x2", x.toString());        // 線の終点X
      line.setAttribute("y2", y.toString());        // 線の終点Y
      line.setAttribute("stroke", "#9ca3af");       // 線の色
      line.setAttribute("stroke-width", "1.5");     // 線の太さ
      svg.appendChild(line);

      // ノードのグループを作成
      const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

      // ノードの背景（楕円）を作成
      const node = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
      node.setAttribute("cx", x.toString());  // 中心のX座標
      node.setAttribute("cy", y.toString());  // 中心のY座標
      node.setAttribute("rx", "60");  // X方向の半径
      node.setAttribute("ry", "25");  // Y方向の半径
      node.setAttribute("fill", colors[i % colors.length].fill);  // 塗りつぶしの色
      node.setAttribute("opacity", "0.2");  // 透明度
      node.setAttribute("stroke", colors[i % colors.length].stroke);  // 枠線の色
      node.setAttribute("stroke-width", "1");  // 枠線の太さ

      // ノードのテキストを作成
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x.toString());  // X座標
      text.setAttribute("y", (y + 5).toString());  // Y座標（少し下にずらす）
      text.setAttribute("text-anchor", "middle");  // テキストの中央揃え
      text.setAttribute("font-size", "10");  // フォントサイズ
      text.setAttribute("fill", colors[i % colors.length].textFill);  // テキストの色

      // テキストが長すぎる場合は省略
      const pointText = keyPoints[i];
      text.textContent = pointText.length > 15 ? pointText.substring(0, 15) + "..." : pointText;

      // グループに背景と文字を追加
      nodeGroup.appendChild(node);
      nodeGroup.appendChild(text);
      // SVGにグループを追加
      svg.appendChild(nodeGroup);
    }
  }, [keyPoints, title]); // keyPointsまたはtitleが変更されたときに実行

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
