import { FunctionComponent, useMemo, useState } from 'react';
import format from 'date-fns/format';

import { Grid, IconButton, Slider } from '@material-ui/core';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import PauseIcon from '@material-ui/icons/Pause';

export interface PlayerProps {
  dates: string[];
  currentDate?: string;
  autoplay?: boolean;
  onUpdateDate?: (date: string) => void;
}

const Player: FunctionComponent<PlayerProps> = function Player({
  dates,
  currentDate = dates[0],
  autoplay = false,
  onUpdateDate,
}) {
  const datesSorted = useMemo(
    () => dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
    [dates],
  );
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const value = datesSorted.findIndex((date) => date === currentDate);

  const play = () => setIsPlaying(true);
  const pause = () => setIsPlaying(false);

  const startLabel = format(new Date(datesSorted[0]), 'P');
  const finishLabel = format(new Date(datesSorted[datesSorted.length - 1]), 'P');

  return (
    <Grid container alignItems="center" spacing={3}>
      <Grid item>
        {!isPlaying && (
          <IconButton onClick={play} aria-label="play">
            <PlayArrowIcon />
          </IconButton>
        )}
        {isPlaying && (
          <IconButton onClick={pause} aria-label="pause">
            <PauseIcon />
          </IconButton>
        )}
      </Grid>
      <Grid item>
        {startLabel}
      </Grid>
      <Grid item style={{ display: 'flex', flexGrow: 1, alignItems: 'center' }}>
        <Slider
          min={0}
          max={datesSorted.length - 1}
          value={value}
          onChange={(event, newValue) => {
            const index = Array.isArray(newValue) ? newValue[0] : newValue;

            if (onUpdateDate) {
              onUpdateDate(datesSorted[index]);
            }
          }}
        />
      </Grid>
      <Grid item>
        {finishLabel}
      </Grid>
    </Grid>
  );
};

export default Player;
