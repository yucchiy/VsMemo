import { GraphView } from '../views/GraphView';

export async function showGraph(graphView: GraphView): Promise<void> {
  await graphView.show();
}