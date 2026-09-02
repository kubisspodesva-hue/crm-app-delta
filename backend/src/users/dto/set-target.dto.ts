import { IsEnum, IsInt, Min } from 'class-validator';
import { TargetMetric, TargetPeriod } from '../../common/enums';

export class SetTargetDto {
  @IsEnum(TargetPeriod)
  period: TargetPeriod;

  @IsEnum(TargetMetric)
  metric: TargetMetric;

  @IsInt()
  @Min(1)
  value: number;
}
