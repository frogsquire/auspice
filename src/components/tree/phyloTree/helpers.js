/* eslint-disable no-param-reassign */
import {getTraitFromNode, getDivFromNode} from "../../../util/treeMiscHelpers";
import { NODE_NOT_VISIBLE } from "../../../util/globals";

/** get a string to be used as the DOM element ID
 * Note that this cannot have any "special" characters
 */
export const getDomId = (type, strain) => {
  const name = typeof strain === "string" ? strain.replace(/[/_.;,~|[\]-]/g, '') : strain;
  return `${type}_${name}`;
};

/**
 * computes a measure of the total number of leaves for each node in
 * the tree, weighting leaves differently if they are inView.
 * Note: function is recursive
 * @param {obj} node -- root node of the tree
 * @returns {undefined}
 * @sideEffects sets `node.leafCount` {number} for all nodes
 */
export const addLeafCount = (node) => {
  if (node.terminal && node.inView) {
    node.leafCount = 1;
  } else if (node.terminal && !node.inView) {
    node.leafCount = 0.15;
  } else {
    node.leafCount = 0;
    for (let i = 0; i < node.children.length; i++) {
      addLeafCount(node.children[i]);
      node.leafCount += node.children[i].leafCount;
    }
  }
};


/*
 * this function takes a call back and applies it recursively
 * to all child nodes, including internal nodes
 * @params:
 *   node -- node to whose children the function is to be applied
 *   func -- call back function to apply
 */
export const applyToChildren = (node, func) => {
  func(node);
  if (node.terminal || node.children === undefined) { // in case clade set by URL, terminal hasn't been set yet!
    return;
  }
  for (let i = 0; i < node.children.length; i++) {
    applyToChildren(node.children[i], func);
  }
};


/*
* given nodes, create the children and parent properties.
* modifies the nodes argument in place
*/
export const createChildrenAndParentsReturnNumTips = (nodes) => {
  let numTips = 0;
  nodes.forEach((d) => {
    d.parent = d.n.parent.shell;
    if (d.terminal) {
      d.yRange = [d.n.yvalue, d.n.yvalue];
      d.children = null;
      numTips++;
    } else {
      d.yRange = [d.n.children[0].yvalue, d.n.children[d.n.children.length - 1].yvalue];
      d.children = [];
      for (let i = 0; i < d.n.children.length; i++) {
        d.children.push(d.n.children[i].shell);
      }
    }
  });
  return numTips;
};

/** setYValuesRecursively
 */
export const setYValuesRecursively = (node, yCounter) => {
  if (node.children) {
    for (let i = node.children.length - 1; i >= 0; i--) {
      yCounter = setYValuesRecursively(node.children[i], yCounter);
    }
  } else {
    node.n.yvalue = ++yCounter;
    node.yRange = [yCounter, yCounter];
    return yCounter;
  }
  /* if here, then all children have yvalues, but we dont. */
  node.n.yvalue = node.children.reduce((acc, d) => acc + d.n.yvalue, 0) / node.children.length;
  node.yRange = [node.n.children[0].yvalue, node.n.children[node.n.children.length - 1].yvalue];
  return yCounter;
};

/** setYValues
 * given nodes, this fn sets node.yvalue for each node
 * Nodes are the phyloTree nodes (i.e. node.n is the redux node)
 * Nodes must have parent child links established (via createChildrenAndParents)
 * PhyloTree can subsequently use this information. Accessed by prototypes
 * rectangularLayout, radialLayout, createChildrenAndParents
 * side effects: node.n.yvalue (i.e. in the redux node) and node.yRange (i.e. in the phyloTree node)
 */
export const setYValues = (nodes) => setYValuesRecursively(nodes[0], 0);

// sorts all child nodes from a subtree into their subtrees
const collectSubtrees = (startNode, subtree, trait, currentTraitValue, subtreeStack) => {
  if (!startNode.children) return;

  for (let i = startNode.children.length-1; i >= 0; i--) {
    let currentNode = startNode.children[i];
    let thisNodeTraitValue = getTraitFromNode(currentNode.n, trait);
    // todo: nodes with no trait value? should they be grouped together?
    if (thisNodeTraitValue !== currentTraitValue) { // doesn't belong on this subtree
      let matchingSubtree = subtreeStack.find(s => s.traitValue === thisNodeTraitValue);
      if (!matchingSubtree) {
        matchingSubtree = { subtreeNodes: [], traitValue: thisNodeTraitValue };
        subtreeStack.push(matchingSubtree);
      }
      collectSubtrees(currentNode, matchingSubtree, trait, thisNodeTraitValue, subtreeStack);
      matchingSubtree.subtreeNodes.push(currentNode);
    }
    else
    {
      collectSubtrees(currentNode, subtree, trait, currentTraitValue, subtreeStack);
      subtree.subtreeNodes.push(currentNode);
    }    
  }
}

const getYValueOfNodeInSubtree = (node, trait, traitValue, currentMaxY) => {
  if (!node.n.children) return ++currentMaxY;

  // children are added to the stack before their parents, 
  // so they should all have a y value already
  const qualifiedChildren = node.n.children.filter(c => 
    getTraitFromNode(c, trait) === traitValue);

  if (qualifiedChildren.length === 0) return ++currentMaxY;

  return qualifiedChildren.reduce((acc, d) => acc + d.yvalue, 0) / qualifiedChildren.length;
}

const getYValueOfFirstSameTraitChild = (node, trait, traitValue) => {
  if (!node.n.children) return node.n.yvalue;

  for (const c of node.n.children) {
    if (getTraitFromNode(c, trait) === traitValue) {
      return c.yvalue;
    }
  }

  return node.n.yvalue;
}

const getYValueOfLastSameTraitChild = (node, trait, traitValue) => {
  if (!node.n.children) return node.n.yvalue;

  for (const c of node.n.children.reverse()) {
    if (getTraitFromNode(c, trait) === traitValue) {
      return c.yvalue;
    }
  }

  return node.n.yvalue;
}

/**
 * setSplitTreeYValues - works similarly to setYValues above,
 * but splits the tree by the given trait, grouping nodes with the
 * same trait value together 
 */
export const setSplitTreeYValues = (nodes, trait) => {
  const subtreeStack = [{subtreeNodes: [], traitValue: getTraitFromNode(nodes[0].n, trait)}];  

  // collect all the subtrees for a given trait, and group them together
  collectSubtrees(nodes[0], subtreeStack[0], trait, subtreeStack[0].traitValue, subtreeStack);  
  subtreeStack[0].subtreeNodes.push(nodes[0]); // finally, add the root node  

  subtreeStack.sort((a, b) => {
    if (!a.traitValue || a.traitValue < b.traitValue) return -1;
    if (!b.traitValue || a.traitValue > b.traitValue) return 1;
    return 0;
  });

  // if there is a subtree for nodes with no trait value, 
  // remove it, and mark all the nodes as hidden
  // it'll always be subtree 0, because it has been sorted to the front
  if (!subtreeStack[0].traitValue) {
    subtreeStack[0].subtreeNodes.forEach(node => {
      node.hideInSplitTree = true;
      node.n.node_attrs.hidden = "always";
      node.inView = NODE_NOT_VISIBLE;
      node.visibility = NODE_NOT_VISIBLE;
      node.n.yvalue = 0;
      node.yRange = [0, 0];
    });
    subtreeStack.shift();
  }

  // sort the subtrees by num_date
  subtreeStack.sort((a, b) => {
    if (a.traitValue == b.traitValue)
      return 0;

    let aDate = getTraitFromNode(a.subtreeNodes[0].n, "num_date");
    let bDate = getTraitFromNode(b.subtreeNodes[0].n, "num_date");
    if (aDate < bDate) return -1;
    if (bDate > aDate) return 1;
    return 0;
  });

  // set the y-values in each subtree
  // such that oldest subtrees are at the top
  let currentMaxY = 0;
  while (subtreeStack.length) {
    const nextSubtree = subtreeStack.shift();
    nextSubtree.subtreeNodes.forEach(node => {
      node.n.yvalue = getYValueOfNodeInSubtree(node, trait, nextSubtree.traitValue, currentMaxY);
      if (!node.n.children) currentMaxY = node.n.yvalue;      
      node.yRange = [getYValueOfFirstSameTraitChild(node, trait, nextSubtree.traitValue),
        getYValueOfLastSameTraitChild(node, trait, nextSubtree.traitValue)];
    });
  }
}


export const formatDivergence = (divergence) => {
  return divergence > 1 ?
    Math.round((divergence + Number.EPSILON) * 1000) / 1000 :
    divergence > 0.01 ?
      Math.round((divergence + Number.EPSILON) * 10000) / 10000 :
      divergence.toExponential(3);
};


/** get the idx of the zoom node (i.e. the in-view root node).
 * This differs depending on which tree is in view so it's helpful to access it
 * by reaching into phyotree to get it
 */
export const getIdxOfInViewRootNode = (node) => {
  return node.shell.that.zoomNode.n.arrayIdx;
};

/**
 * Are the provided nodes within some divergence / time of each other?
 * NOTE: `otherNode` is always closer to the root in the tree than `node`
 */
function isWithinBranchTolerance(node, otherNode, distanceMeasure) {
  if (distanceMeasure === "num_date") {
    /* We calculate the threshold by reaching into phylotree to extract the date range of the dataset
    and then split the data into ~50 slices. This could be refactored to not reach into phylotree. */
    const tolerance = (node.shell.that.dateRange[1]-node.shell.that.dateRange[0])/50;
    return (getTraitFromNode(node, "num_date") - tolerance < getTraitFromNode(otherNode, "num_date"));
  }
  /* Compute the divergence tolerance similarly to above. This uses the approach used to compute the
  x-axis grid within phyotree, and could be refactored into a helper function. Note that we don't store
  the maximum divergence on the tree so we use the in-view max instead */
  const tolerance = (node.shell.that.xScale.domain()[1] - node.shell.that.nodes[0].depth)/50;
  return (getDivFromNode(node) - tolerance < getDivFromNode(otherNode));
}


/**
 * Given a `node`, get the parent, grandparent etc node which is beyond some
 * branch length threshold (either divergence or time). This is useful for finding the node
 * beyond a polytomy, or polytomy-like structure
 * @param {object} node - tree node
 * @param {string} getParentBeyondPolytomy -- 'num_date' or 'div'
 * @returns {object} the closest node up the tree (towards the root) which is beyond
 * some threshold
 */
export const getParentBeyondPolytomy = (node, distanceMeasure) => {
  let potentialNode = node.parent;
  while (isWithinBranchTolerance(node, potentialNode, distanceMeasure)) {
    if (potentialNode === potentialNode.parent) break; // root node of tree
    potentialNode = potentialNode.parent;
  }
  return potentialNode;
};
