import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  line,
  area,
  curveBasis,
  curveLinearClosed,
} from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import { axisRight } from 'd3-axis';
import { select } from 'd3-selection';
import styled from '@mui/styled-engine';

import findIntersections from './helpers/findIntersections';
import calcWaterVolume from './helpers/calcWaterVolume';

import Icon from './shapes/Icon';
import Bridge from './shapes/Bridge';

import {
  LevelIndicator,
  ProfilePoint,
  ProfileShape,
  RiverProfile,
} from './types';

const StyledSection = styled('section')({
  display: 'flex',
  flexDirection: 'column',
});

const Legend = styled('ul')({
  display: 'flex',
  justifyContent: 'flex-end',
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

const LegendItem = styled('li')({
  display: 'flex',
  alignItems: 'center',
  marginLeft: '1rem',
  fontSize: 12,
});

const LegendIconMean = styled('span')({
  display: 'block',
  width: 0,
  height: 0,
  borderTop: '6px solid transparent',
  borderBottom: '6px solid transparent',
  borderRight: '6px solid red',
  marginRight: 5,
});

export interface ProfileProps {
  profile?: RiverProfile;
  riverWidth?: number;
  shapes?: ProfileShape[];
  minWaterLevel?: number;
  currentWaterLevel?: number;
  axis?: boolean;
  width?: number;
  groundStroke?: boolean;
  groundGradient?: boolean;
  groundFill?: string;
  strokeColor?: string;
  strokeWidth?: number;
  waterStrokeColor?: string;
  waterFill?: string;
  mslLabel?: string;
  formatDistance?: (d: number) => string;
  levels?: LevelIndicator[];
  meanLevel?: number;
  meanStrokeColor?: string;
  meanLabel?: string;
}

const findHighestPoint = (items: RiverProfile): ProfilePoint => items.reduce((a, b) => {
  if (b.y > a.y) {
    return b;
  }

  return a;
}, { x: 0, y: 0 });

const Profile: FunctionComponent<ProfileProps> = function Profile({
  profile: riverProfile,
  riverWidth: rw = 10,
  minWaterLevel,
  shapes = [],
  currentWaterLevel,
  axis = false,
  width = 600,
  groundStroke = false,
  groundGradient = true,
  strokeColor = 'black',
  strokeWidth = 1.5,
  waterStrokeColor = '#0633ff',
  waterFill = '#99ccff',
  groundFill = '#b4967d',
  mslLabel = 'MASL',
  formatDistance = (d: number) => `${(d / 100).toFixed(1)} m`,
  meanLevel,
  meanLabel = 'Mean-level',
  meanStrokeColor = '#b7323f',
  levels: inputLevels = [],
}) {
  const levels = typeof meanLevel !== 'undefined' ? [
    {
      name: meanLabel,
      y: meanLevel,
      strokeColor: meanStrokeColor,
      strokeWidth: 1.5,
      strokeDasharray: '5,3',
    },
    ...inputLevels,
  ] : inputLevels;

  const minWater = useMemo(() => {
    if (riverProfile) {
      return minWaterLevel || 0;
    }

    if (typeof minWaterLevel === 'undefined') {
      return Math.min(...shapes.map((s) => Math.min(...(s.points).map((p) => p.y))));
    }

    return minWaterLevel;
  }, [riverProfile, minWaterLevel]);

  const profile: RiverProfile = riverProfile || [
    { x: 0, y: currentWaterLevel || minWater },
    { x: 0, y: minWater },
    { x: rw, y: minWater },
    { x: rw, y: currentWaterLevel || minWater },
  ];
  const hasBank = !!riverProfile;
  const riverCurve = hasBank ? curveBasis : curveLinearClosed;

  const axisRightRef = useRef<SVGGElement>(null);

  const maxMSL = Math.max(
    ...profile.map((p) => p.y),
    ...shapes.map(
      (s) => s.points.map((p) => p.y + (s.type === 'bridge' ? s.bridgeHeight : 0)),
    ).flat(),
  );
  const minMSL = Math.min(...profile.map((p) => p.y));

  const maxWaterXL = useMemo(() => findHighestPoint(profile
    .slice(0, Math.round(profile.length / 2))), [profile]);
  const maxWaterXR = useMemo(() => findHighestPoint(profile
    .slice(Math.round(profile.length / 2) * -1)), [profile]);

  const intersections = findIntersections(profile, currentWaterLevel);
  const waterVolume = calcWaterVolume(profile, intersections);

  const riverWidth = Math.max(...profile.map((p) => p.x));
  const riverAndBridgeHeight = maxMSL - minMSL;

  const padding = 5;
  const offsetRight = axis ? 55 : 0;
  const offsetBottom = 0;
  const bankPadding = 15;
  const rulerOffset = 8;
  const rulerTickSize = 8;

  const totalWidth = width;
  const renderWidth = totalWidth - (padding * 2) - offsetRight;
  const renderHeight = ((riverAndBridgeHeight / riverWidth) * renderWidth);
  const totalHeight = renderHeight + bankPadding + (padding * 2) + offsetBottom;

  const xScale = useMemo(() => scaleLinear()
    .domain([0, riverWidth])
    .range([0, renderWidth]), [renderWidth, riverWidth]);

  const yScale = useMemo(() => scaleLinear()
    .domain([minMSL, maxMSL])
    .range([renderHeight, 0]), [maxMSL, minMSL, renderHeight])
    .nice();

  const xScaleProfile = useCallback(
    (x: number): number => xScale(x) + padding,
    [xScale],
  );
  const yScaleProfile = (msl: number): number => yScale(msl) + padding;
  const profilePointX = (d: ProfilePoint): number => xScaleProfile(d.x);
  const profilePointY = (d: ProfilePoint): number => yScaleProfile(d.y);

  const xScaleWater = useMemo(() => {
    const leftX = intersections ? intersections[0].x : 0;
    const rightX = intersections ? intersections[1].x : 0;

    return scaleLinear()
      .domain([0, rightX - leftX])
      .range([0, xScaleProfile(rightX) - xScaleProfile(leftX)]);
  }, [intersections, xScaleProfile]);

  useEffect(() => {
    if (axisRightRef.current !== null) {
      const rightAxis = axisRight(yScale);

      select(axisRightRef.current)
        .call(rightAxis);
    }
  }, [yScale]);

  const bankLine = area<ProfilePoint>()
    .x(profilePointX)
    .y(profilePointY)
    .y1(() => yScaleProfile(minMSL) + bankPadding)
    .curve(curveBasis);

  const bankPath = bankLine(profile);

  const waterLeft = typeof currentWaterLevel !== 'undefined' && currentWaterLevel > maxWaterXL.y
    ? xScaleProfile(profile[0].x) : xScaleProfile(maxWaterXL.x);
  const waterRight = typeof currentWaterLevel !== 'undefined' && currentWaterLevel > maxWaterXR.y
    ? xScaleProfile(profile[profile.length - 1].x) : xScaleProfile(maxWaterXR.x);

  const waterRulerPath = line()(
    typeof currentWaterLevel !== 'undefined' ? [
      [xScaleWater(xScaleWater.domain()[0]), -(rulerTickSize / 2)],
      [xScaleWater(xScaleWater.domain()[0]), rulerTickSize / 2],
      [xScaleWater(xScaleWater.domain()[0]), 0],
      [xScaleWater(xScaleWater.domain()[1]), 0],
      [xScaleWater(xScaleWater.domain()[1]), rulerTickSize / 2],
      [xScaleWater(xScaleWater.domain()[1]), -(rulerTickSize / 2)],
    ] : [],
  );

  const maxWaterPoint = yScaleProfile(currentWaterLevel || minMSL);
  const waterArea = area<ProfilePoint>()
    .x((d) => {
      const linePoint = profilePointX(d);

      if (intersections && linePoint < xScaleProfile(intersections[0].x)) {
        return xScaleProfile(intersections[0].x);
      }

      if (intersections && linePoint > xScaleProfile(intersections[1].x)) {
        return xScaleProfile(intersections[1].x);
      }

      if (linePoint < waterLeft) {
        return waterLeft;
      }

      if (linePoint > waterRight) {
        return waterRight;
      }

      return linePoint;
    })
    .y1((d) => {
      const linePoint = profilePointY(d);

      return maxWaterPoint < linePoint ? linePoint : maxWaterPoint;
    })
    .y0(() => maxWaterPoint)
    .curve(riverCurve);
  const waterAreaPath = waterArea(profile);

  const indicatorSize = 5;
  const axisOffset = 5;

  const hasLegend = levels.filter((l) => !l.hideLine).length > 0;

  const hasInfiniteWater = typeof riverProfile === 'undefined'
    && typeof minWaterLevel === 'undefined';

  return (
    <StyledSection style={{ width: totalWidth }}>
      <svg
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      >
        <style>
          {`
          .text {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 
              'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            font-size: 12px;
          }
          `}
        </style>
        {groundGradient && (
          <defs>
            <linearGradient id="ground-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop stopColor={groundFill} stopOpacity={1} offset="0%" />
              <stop stopColor={groundFill} stopOpacity={0.9} offset="5%" />
              <stop stopColor={groundFill} stopOpacity={0.2} offset="100%" />
            </linearGradient>
          </defs>
        )}
        {hasBank && (
          <>
            <mask id="ground-mask" maskUnits="userSpaceOnUse">
              <rect x="0" y="0" width={totalWidth} height={totalHeight} fill="white" />
              <path
                d={[bankPath].join(' ')}
                fill="black"
                stroke="white"
                strokeWidth={strokeWidth}
                vectorEffect="non-scaling-stroke"
              />
            </mask>
            <path
              id="ground"
              d={[bankPath].join(' ')}
              stroke={strokeColor}
              strokeWidth={groundStroke ? strokeWidth : 0}
              fill={groundGradient ? 'url(#ground-gradient)' : groundFill}
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
        {typeof currentWaterLevel !== 'undefined' && (
          <>
            <defs>
              <linearGradient id="water-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop stopColor={waterFill} stopOpacity={1} offset="0%" />
                <stop
                  stopColor={waterFill}
                  stopOpacity={hasInfiniteWater ? 0.2 : 0.5}
                  offset="100%"
                />
              </linearGradient>
            </defs>
            <path
              id="water"
              d={[waterAreaPath].join(' ')}
              stroke={waterStrokeColor}
              strokeWidth={hasInfiniteWater ? 0 : strokeWidth}
              fill="url(#water-gradient)"
              mask="url(#ground-mask)"
              vectorEffect="non-scaling-stroke"
            />
            {hasInfiniteWater && (
              <path
                stroke={waterStrokeColor}
                strokeWidth={strokeWidth}
                vectorEffect="non-scaling-stroke"
                d={`
                M${xScaleProfile(0)},${yScaleProfile(currentWaterLevel)} 
                L${xScaleProfile(rw)},${yScaleProfile(currentWaterLevel)}
                `}
              />
            )}
          </>
        )}
        {shapes.map((shape) => {
          if (shape.type === 'polygon') {
            return (
              <polygon
                fill={shape.fill || '#ccc'}
                stroke={shape.strokeColor || '#000'}
                strokeWidth={typeof shape.strokeWidth === 'undefined' ? 1.5 : shape.strokeWidth}
                key={`polygon_${shape.points.map((p) => `[${p.x},${p.y}]`).join('')}`}
                vectorEffect="non-scaling-stroke"
                points={
                  shape.points.map((p) => `${profilePointX(p)},${profilePointY(p)}`).join(' ')
                }
              />
            );
          }

          if (shape.type === 'path') {
            return (
              <path
                fill={shape.fill || 'transparent'}
                stroke={shape.strokeColor || '#000'}
                strokeWidth={typeof shape.strokeWidth === 'undefined' ? 1.5 : shape.strokeWidth}
                key={`path_${shape.points.map((p) => `[${p.x},${p.y}]`).join('')}`}
                vectorEffect="non-scaling-stroke"
                d={shape.points.map((p, i) => {
                  const action = i === 0 ? 'M' : 'L';
                  return `${action}${profilePointX(p)},${profilePointY(p)}`;
                }).join(' ')}
              />
            );
          }

          if (shape.type === 'icon') {
            return (
              <Icon
                name={shape.name}
                width={xScale(shape.width)}
                height={xScale(shape.height)}
                transform={
                  `translate(${xScale(shape.points[0].x)}, ${yScaleProfile(shape.points[0].y)})`
                }
                key={
                  `path_icon_${shape.name}_${shape.points.map((p) => `[${p.x},${p.y}]`).join('')}`
                }
              />
            );
          }

          if (shape.type === 'bridge') {
            return (
              <Bridge
                shape={shape}
                xScale={xScaleProfile}
                yScale={yScaleProfile}
                key={`path_bridge_${shape.points.map((p) => `[${p.x},${p.y}]`).join('')}`}
              />
            );
          }

          return null;
        })}
        {levels.map((l) => {
          const fillColor = l.strokeColor || '#000';

          const indicatorPoints = [
            [xScaleProfile(riverWidth) + axisOffset, yScaleProfile(l.y)],
            [
              xScaleProfile(riverWidth) + axisOffset + indicatorSize,
              yScaleProfile(l.y) + indicatorSize,
            ],
            [
              xScaleProfile(riverWidth) + axisOffset + indicatorSize,
              yScaleProfile(l.y) - indicatorSize,
            ],
          ].map((p) => p.join(',')).join(' ');

          const heightTopPoints = [
            [(xScaleProfile(riverWidth / 2)) - indicatorSize, yScaleProfile(l.y) + indicatorSize],
            [
              xScaleProfile(riverWidth / 2),
              yScaleProfile(l.y),
            ],
            [(xScaleProfile(riverWidth / 2)) + indicatorSize, yScaleProfile(l.y) + indicatorSize],
          ].map((p) => p.join(',')).join(' ');

          const heightBottomPoints = [
            [
              (xScaleProfile(riverWidth / 2)) - indicatorSize,
              yScaleProfile(currentWaterLevel || 0) - indicatorSize,
            ],
            [
              xScaleProfile(riverWidth / 2),
              yScaleProfile(currentWaterLevel || 0),
            ],
            [
              (xScaleProfile(riverWidth / 2)) + indicatorSize,
              yScaleProfile(currentWaterLevel || 0) - indicatorSize,
            ],
          ].map((p) => p.join(',')).join(' ');

          return (
            <g key={l.name}>
              {!l.hideLine && (
                <>
                  <line
                    id={`level_${l.name}`}
                    x1={xScaleProfile(0)}
                    x2={xScaleProfile(riverWidth)}
                    y1={yScaleProfile(l.y)}
                    y2={yScaleProfile(l.y)}
                    stroke={fillColor}
                    strokeWidth={typeof l.strokeWidth !== 'undefined' ? l.strokeWidth : 1.5}
                    strokeDasharray={l.strokeDasharray || '5,3'}
                    vectorEffect="non-scaling-stroke"
                  />
                  <polygon
                    id={`level_indicator_${l.name}`}
                    fill={fillColor}
                    points={indicatorPoints}
                  />
                </>
              )}
              {l.showRelationToWaterLevel && typeof currentWaterLevel !== 'undefined' && (
                <>
                  <polygon
                    fill={fillColor}
                    points={heightTopPoints}
                  />
                  <line
                    stroke={fillColor}
                    x1={xScaleProfile(riverWidth / 2)}
                    x2={xScaleProfile(riverWidth / 2)}
                    y1={yScaleProfile(l.y) + 2}
                    y2={yScaleProfile(l.y - (Math.abs(l.y - currentWaterLevel) / 2)) - 8}
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                  <polygon
                    fill={fillColor}
                    points={heightBottomPoints}
                  />
                  <line
                    stroke={fillColor}
                    x1={xScaleProfile(riverWidth / 2)}
                    x2={xScaleProfile(riverWidth / 2)}
                    y1={yScaleProfile(currentWaterLevel) - 2}
                    y2={yScaleProfile(l.y - (Math.abs(l.y - currentWaterLevel) / 2)) + 8}
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    className="text"
                    textAnchor="middle"
                    x={xScaleProfile(riverWidth / 2)}
                    y={yScaleProfile(l.y - (Math.abs(l.y - currentWaterLevel) / 2)) + 5}
                  >
                    {formatDistance(Math.abs(l.y - currentWaterLevel) * 100)}
                  </text>
                </>
              )}
            </g>
          );
        })}
        {axis && (
          <g>
            <g
              ref={axisRightRef}
              transform={`translate(${renderWidth + padding + axisOffset}, ${padding})`}
            />
            <text
              style={{ textAnchor: 'middle', transform: 'rotate(-90deg)', fontSize: '12px' }}
              y={36 + axisOffset + padding + renderWidth}
              x={(yScale(minMSL) / 2) * -1}
            >
              {mslLabel}
            </text>
            {typeof currentWaterLevel !== 'undefined' && intersections && (
              <g
                transform={`translate(
                  ${xScaleProfile(intersections[0].x)}, 
                  ${yScaleProfile(currentWaterLevel || minMSL) - rulerOffset}
                )`}
              >
                <path
                  id="water-ruler"
                  d={[waterRulerPath].join(' ')}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  fillOpacity={0}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  textAnchor="middle"
                  transform={
                    `translate(${xScaleProfile((intersections[1].x - intersections[0].x) / 2)}, -5)`
                  }
                  fontSize={12}
                >
                  {formatDistance((intersections[1].x - intersections[0].x) * 100)}
                  {' / '}
                  {formatDistance(waterVolume * 100)}
                  <tspan dy="-4" fontSize={9}>2</tspan>
                </text>
              </g>
            )}
          </g>
        )}
      </svg>
      {hasLegend && (
        <Legend style={{ paddingRight: offsetRight + padding }}>
          {levels.filter((l) => !l.hideLine).map((l) => (
            <LegendItem key={l.name}>
              <LegendIconMean
                style={{
                  borderRightColor: l.strokeColor || '#000',
                  borderRightWidth: indicatorSize,
                  borderTopWidth: indicatorSize,
                  borderBottomWidth: indicatorSize,
                }}
              />
              {l.name}
            </LegendItem>
          ))}
        </Legend>
      )}
    </StyledSection>
  );
};

export default Profile;
