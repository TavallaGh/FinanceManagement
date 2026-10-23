/* Filename: DesignSystem.js */
(() => {
  const { 
    Button, Card, Badge, PageHeader, Tabs, Skeleton, EmptyState, StatCard, 
    Timeline, Avatar, DropdownMenu, ProgressBar, Stepper, Spinner 
  } = window.DSCore || {};

  const {
    TextField, SelectField, ToggleField, CheckboxField, CurrencyField, 
    TextAreaField, RadioGroup, DatePicker, AttachmentManager, TagInput,
    SuffixField
  } = window.DSForms || {};

  const { AdvancedFilter, DataGrid, LOVField } = window.DSGrid || {};

  const { HighlightText, Tree, TreeGrid } = window.DSTree || {};

  const { Modal, Tooltip, Alert, Toast, Banner, Dialog } = window.DSFeedback || {};

  const { Drawer, ContextMenu, Popover } = window.DSOverlays || {};

  const { BarChart, LineChart, DonutChart, PieChart, GaugeChart } = window.DSCharts || {};

  const DesignSystem = { 
    Button, 
    TextField, 
    SelectField, 
    ToggleField, 
    CheckboxField, 
    LOVField, 
    Card, 
    Badge, 
    PageHeader, 
    Modal, 
    AdvancedFilter, 
    AttachmentManager, 
    Tabs, 
    DataGrid, 
    HighlightText, 
    Tree, 
    TreeGrid,
    CurrencyField, 
    TextAreaField, 
    RadioGroup, 
    Tooltip, 
    Skeleton, 
    EmptyState, 
    StatCard, 
    Timeline, 
    Avatar, 
    DropdownMenu, 
    ProgressBar, 
    DatePicker, 
    Stepper, 
    TagInput, 
    Alert, 
    Toast, 
    Banner, 
    Dialog, 
    Spinner,
    Drawer,
    ContextMenu,
    Popover,
    BarChart,
    LineChart,
    DonutChart,
    PieChart,
    GaugeChart,
    SuffixField
  };

  window.DesignSystem = DesignSystem;
})();