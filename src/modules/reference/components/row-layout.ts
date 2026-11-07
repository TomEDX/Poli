// One grid for every row, with the same padding, so columns line up. On phones the slug
// drops under the name, so no column is hidden and the name keeps the width; from md up
// the slug and the three action buttons get fixed-width columns.
export const rowGrid =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 px-2 md:grid-cols-[minmax(0,1fr)_16rem_4.75rem]";

export const slugCell = "col-start-1 row-start-2 md:col-start-2 md:row-start-1";

export const actionsCell = "col-start-2 row-span-2 row-start-1 md:col-start-3 md:row-span-1";

// Icon buttons are 32px on phones so a finger can hit them, 24px with a mouse.
export const iconButton = "size-8 touch-manipulation md:size-6";
