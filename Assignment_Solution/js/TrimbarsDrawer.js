import { distance } from "./utils.js";

/**
 * TrimbarsDrawer - Class for drawing and managing trim bars on canvas overlay
 */
export default class TrimbarsDrawer {
  constructor(canvas, leftTrimBarX, rightTrimBarX) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.leftTrimBar = {
      x: leftTrimBarX,
      color: "#00ff00",
      selectedColor: "#ff6b6b",
      selected: false,
      dragged: false,
    };

    this.rightTrimBar = {
      x: rightTrimBarX,
      color: "#00ff00",
      selectedColor: "#ff6b6b",
      selected: false,
      dragged: false,
    };
  }

  /**
   * Clear the overlay canvas
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw the trim bars
   */
  draw() {
    const ctx = this.ctx;
    ctx.save();

    ctx.lineWidth = 3;

    // Left trim bar line
    ctx.strokeStyle = this.leftTrimBar.color;
    ctx.beginPath();
    ctx.moveTo(this.leftTrimBar.x, 0);
    ctx.lineTo(this.leftTrimBar.x, this.canvas.height);
    ctx.stroke();

    // Right trim bar line
    ctx.strokeStyle = this.rightTrimBar.color;
    ctx.beginPath();
    ctx.moveTo(this.rightTrimBar.x, 0);
    ctx.lineTo(this.rightTrimBar.x, this.canvas.height);
    ctx.stroke();

    // Left triangle handle - LARGER and EASIER TO GRAB
    ctx.fillStyle = this.leftTrimBar.color;
    ctx.beginPath();
    ctx.moveTo(this.leftTrimBar.x, 0);
    ctx.lineTo(this.leftTrimBar.x + 20, 18);
    ctx.lineTo(this.leftTrimBar.x, 36);
    ctx.fill();

    // Right triangle handle - LARGER and EASIER TO GRAB
    ctx.fillStyle = this.rightTrimBar.color;
    ctx.beginPath();
    ctx.moveTo(this.rightTrimBar.x, 0);
    ctx.lineTo(this.rightTrimBar.x - 20, 18);
    ctx.lineTo(this.rightTrimBar.x, 36);
    ctx.fill();

    // Grey overlay for trimmed regions
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, this.leftTrimBar.x, this.canvas.height);
    ctx.fillRect(
      this.rightTrimBar.x,
      0,
      this.canvas.width - this.rightTrimBar.x,
      this.canvas.height
    );

    ctx.restore();
  }

  /**
   * Highlight trim bars when mouse is close
   */
  highLightTrimBarsWhenClose(mousePos) {
    // Check left trim bar - INCREASED DETECTION RADIUS
    let d = distance(mousePos.x, mousePos.y, this.leftTrimBar.x, 18);

    if (d < 25 && !this.rightTrimBar.selected) {
      this.leftTrimBar.color = this.leftTrimBar.selectedColor;
      this.leftTrimBar.selected = true;
    } else {
      this.leftTrimBar.color = "#00ff00";
      this.leftTrimBar.selected = false;
    }

    // Check right trim bar - INCREASED DETECTION RADIUS
    d = distance(mousePos.x, mousePos.y, this.rightTrimBar.x, 18);
    if (d < 25 && !this.leftTrimBar.selected) {
      this.rightTrimBar.color = this.rightTrimBar.selectedColor;
      this.rightTrimBar.selected = true;
    } else {
      this.rightTrimBar.color = "#00ff00";
      this.rightTrimBar.selected = false;
    }
  }

  /**
   * Start dragging trim bar
   */
  startDrag() {
    if (this.leftTrimBar.selected) {
      this.leftTrimBar.dragged = true;
    }
    if (this.rightTrimBar.selected) {
      this.rightTrimBar.dragged = true;
    }
  }

  /**
   * Stop dragging trim bar
   */
  stopDrag() {
    if (this.leftTrimBar.dragged) {
      this.leftTrimBar.dragged = false;
      this.leftTrimBar.selected = false;

      // Ensure left stays left of right
      if (this.leftTrimBar.x > this.rightTrimBar.x) {
        this.leftTrimBar.x = this.rightTrimBar.x;
      }
    }

    if (this.rightTrimBar.dragged) {
      this.rightTrimBar.dragged = false;
      this.rightTrimBar.selected = false;

      // Ensure right stays right of left
      if (this.rightTrimBar.x < this.leftTrimBar.x) {
        this.rightTrimBar.x = this.leftTrimBar.x;
      }
    }
  }

  /**
   * Move trim bars based on mouse position
   */
  moveTrimBars(mousePos) {
    this.highLightTrimBarsWhenClose(mousePos);

    // Constrain to canvas bounds
    const clampedX = Math.max(0, Math.min(mousePos.x, this.canvas.width));

    if (this.leftTrimBar.dragged) {
      // Only move if it stays left of right bar
      if (clampedX < this.rightTrimBar.x) {
        this.leftTrimBar.x = clampedX;
      }
    }

    if (this.rightTrimBar.dragged) {
      // Only move if it stays right of left bar
      if (clampedX > this.leftTrimBar.x) {
        this.rightTrimBar.x = clampedX;
      }
    }

    // Redraw trim bars after moving
    this.clear();
    this.draw();
  }
}
