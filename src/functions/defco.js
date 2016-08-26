export default function (ednObject, { context, compile }) {
  // TODO create and return { graph, port }
  return {
    context, // new context (with new deco'ed component)
    node, // created node
    outputPort: 'output' // output port for next component (not applicable for defco)
  }
}
